/**
 * One-off migration: read MongoDB export (JSON arrays or BSON from mongodump), map ObjectIds to UUIDs,
 * transform to Drizzle schema shape, and insert into Supabase/Postgres in FK order.
 *
 * Usage:
 *   Export path: MONGO_EXPORT_PATH env or first CLI arg (default: ../Feasibility_2026-02-24_14-18-35/Hello)
 *   Example: npm run migrate:mongo -- "../Feasibility_2026-02-24_14-18-35/Hello" --truncate
 *   DATABASE_URL must be set (Supabase Postgres).
 *   --truncate: truncate target tables (reverse FK order) before inserting.
 *
 * Expects in export folder either:
 *   - JSON: users.json, templates.json, versions.json, formulatemplates.json, contacts.json,
 *     aboutus.json, bills.json, pdfdownloadlogs.json, filetemplates.json (each = JSON array), or
 *   - BSON (mongodump): users.bson, templates.bson, ... (same base names, .bson files).
 */

import "dotenv/config";
import { readFile } from "fs/promises";
import { join } from "path";
import { BSON } from "bson";
import { db } from "../src/db/index.js";
import {
  users,
  templates,
  versions,
  directFeasibilities,
  contacts,
  aboutUs,
  bills,
  pdfDownloadLogs,
  fileTemplates,
} from "../src/schema/index.js";
import { sql } from "drizzle-orm";

const argv = process.argv.slice(2).filter((a) => a !== "--truncate");
const defaultExport = join(process.cwd(), "./scripts/", "Feasibility_2026-02-25_21-59-47", "Hello");
const EXPORT_PATH = process.env.MONGO_EXPORT_PATH || argv[0] || defaultExport;
const TRUNCATE = process.argv.includes("--truncate");

const BATCH_SIZE = 100;

function idStr(doc) {
  if (!doc || doc._id == null) return null;
  return typeof doc._id === "string" ? doc._id : doc._id.toString();
}

function mapRef(map, ref) {
  if (ref == null) return null;
  const s = typeof ref === "string" ? ref : ref?.toString?.() ?? null;
  return s ? map.get(s) ?? null : null;
}

function mapRefArray(map, arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => mapRef(map, r)).filter(Boolean);
}

function toDate(v) {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function get(doc, ...keys) {
  for (const k of keys) {
    if (doc && doc[k] !== undefined && doc[k] !== null) return doc[k];
  }
  return undefined;
}

/** Parse mongodump-style BSON file (each BSON doc starts with int32 LE size including the 4 bytes). */
function parseBsonBuffer(buf) {
  const docs = [];
  let offset = 0;
  while (offset + 4 <= buf.length) {
    const size = buf.readInt32LE(offset);
    if (size < 5 || offset + size > buf.length) break;
    const doc = BSON.deserialize(buf.subarray(offset, offset + size));
    docs.push(doc);
    offset += size;
  }
  return docs;
}

/** Load collection: try baseName.json first, then baseName.bson (mongodump). */
async function loadCollection(dir, baseName) {
  const jsonPath = join(dir, `${baseName}.json`);
  try {
    const raw = await readFile(jsonPath, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [data];
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const bsonPath = join(dir, `${baseName}.bson`);
  try {
    const buf = await readFile(bsonPath);
    return parseBsonBuffer(Buffer.from(buf));
  } catch (e) {
    if (e.code === "ENOENT") {
      console.warn(`[skip] ${baseName}.json / ${baseName}.bson not found in ${dir}`);
      return [];
    }
    throw e;
  }
}

async function truncateAll() {
  const schema = process.env.DB_SCHEMA ?? "final";
  console.log(`Truncating tables in schema "${schema}" (reverse FK order)...`);
  const order = [
    "pdf_download_logs",
    "bills",
    "contacts",
    "direct_feasibilities",
    "versions",
    "templates",
    "file_templates",
    "about_us",
    "users",
  ];
  for (const table of order) {
    await db.execute(sql.raw(`TRUNCATE TABLE "${schema}"."${table}" CASCADE`));
    console.log(`  truncated ${schema}.${table}`);
  }
}

async function migrateUsers(dir, idMaps) {
  const rows = await loadCollection(dir, "users");
  const map = new Map();
  const seenEmail = new Set();
  const seenPhone = new Set();
  const out = [];

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    map.set(oldId, oldId);

    const email = get(doc, "email") ?? "";
    const phone = get(doc, "phone_number", "phoneNumber") ?? "";
    if (seenEmail.has(email) || seenPhone.has(phone)) {
      console.warn(`[users] duplicate email or phone, skipping _id ${oldId}`);
      continue;
    }
    if (email) seenEmail.add(email);
    if (phone) seenPhone.add(phone);

    out.push({
      id: oldId,
      actualCreatedAt: toDate(get(doc, "actualCreatedAt", "actual_created_at")),
      name: get(doc, "name"),
      username: get(doc, "username"),
      email: email || "migrated@placeholder.local",
      password: get(doc, "password") ?? "migrated-no-password",
      role: ["user", "admin", "client"].includes(get(doc, "role")) ? get(doc, "role") : "user",
      paths: get(doc, "paths"),
      status: get(doc, "status") ?? "active",
      isDisabled: get(doc, "isDisabled", "is_disabled") ?? false,
      phoneCountryCode: get(doc, "phone_country_code", "phoneCountryCode"),
      phoneNumber: phone || oldId.slice(0, 12),
      firstName: get(doc, "first_name", "firstName"),
      lastName: get(doc, "last_name", "lastName"),
    });
  }

  idMaps.users = map;
  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    const chunk = out.slice(i, i + BATCH_SIZE);
    await db.insert(users).values(chunk).onConflictDoNothing();
  }
  console.log(`  users: ${out.length} rows`);
}

async function migrateTemplates(dir, idMaps) {
  const rows = await loadCollection(dir, "templates");
  const map = new Map();
  const userMap = idMaps.users || new Map();
  const versionMap = idMaps.versions || new Map();

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    map.set(oldId, oldId);
  }
  idMaps.templates = map;

  const out = [];
  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    const newId = map.get(oldId);

    out.push({
      id: newId,
      pages: get(doc, "pages") ?? [],
      masterinput: get(doc, "masterinput") ?? [],
      masterinputfromother: get(doc, "masterinputfromother") ?? [],
      importedInputSections: get(doc, "imported_input_sections", "importedInputSections") ?? [],
      pagesfromother: get(doc, "pagesfromother") ?? [],
      inputsections: get(doc, "inputsections") ?? [],
      dashboards: get(doc, "dashboards") ?? [],
      name: get(doc, "name"),
      subject: get(doc, "subject") ?? "No Subject",
      scheme: get(doc, "scheme"),
      rulebook: get(doc, "rulebook"),
      description: get(doc, "description"),
      templateId: mapRef(map, get(doc, "templateId")),
      userid: mapRef(userMap, get(doc, "userid")),
      date: toDate(get(doc, "date")),
      tags: Array.isArray(get(doc, "tags")) ? get(doc, "tags") : [],
      favourites: mapRefArray(userMap, get(doc, "favourites") ?? []),
      likedby: mapRefArray(userMap, get(doc, "likedby") ?? []),
      adminusers: mapRefArray(userMap, get(doc, "adminusers") ?? []),
      createdAt: toDate(get(doc, "CreatedAt", "createdAt")),
      quotes: get(doc, "quotes") ?? [],
      currentversion: mapRef(versionMap, get(doc, "currentversion")),
      publishid: mapRef(versionMap, get(doc, "publishid")),
      toPublish: get(doc, "toPublish", "to_publish") ?? false,
      blogdetails: get(doc, "blogdetails"),
      blocks: get(doc, "blocks"),
      linktohtml: get(doc, "linktohtml"),
      isDisabled: get(doc, "isDisabled", "is_disabled") ?? false,
      order: get(doc, "order") ?? 0,
    });
  }

  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    await db.insert(templates).values(out.slice(i, i + BATCH_SIZE)).onConflictDoNothing();
  }
  console.log(`  templates: ${out.length} rows`);
}

async function migrateVersions(dir, idMaps) {
  const rows = await loadCollection(dir, "versions");
  const map = new Map();
  const templateMap = idMaps.templates || new Map();
  const out = [];

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    map.set(oldId, oldId);

    out.push({
      id: oldId,
      pages: get(doc, "pages") ?? [],
      masterinput: get(doc, "masterinput") ?? [],
      masterinputfromother: get(doc, "masterinputfromother") ?? [],
      importedInputSections: get(doc, "imported_input_sections", "importedInputSections") ?? [],
      pagesfromother: get(doc, "pagesfromother") ?? [],
      inputsections: get(doc, "inputsections") ?? [],
      dashboards: get(doc, "dashboards") ?? [],
      name: get(doc, "name"),
      subject: get(doc, "subject") ?? "No Subject",
      scheme: get(doc, "scheme"),
      rulebook: get(doc, "rulebook"),
      description: get(doc, "description"),
      templateId: mapRef(templateMap, get(doc, "templateId")),
      date: toDate(get(doc, "date")),
      createdAt: toDate(get(doc, "CreatedAt", "createdAt")),
      versionof: mapRef(templateMap, get(doc, "versionof")),
    });
  }

  idMaps.versions = map;
  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    await db.insert(versions).values(out.slice(i, i + BATCH_SIZE)).onConflictDoNothing();
  }
  console.log(`  versions: ${out.length} rows`);
}

async function migrateDirectFeasibilities(dir, idMaps) {
  const rows = await loadCollection(dir, "formulatemplates");
  const userMap = idMaps.users || new Map();
  const templateMap = idMaps.templates || new Map();
  const out = [];

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    const templateId = mapRef(templateMap, get(doc, "templateId"));
    if (!templateId) {
      console.warn(`[formulatemplates] skipping ${oldId}: no templateId`);
      continue;
    }

    out.push({
      id: oldId,
      templateId,
      pages: get(doc, "pages") ?? [],
      masterinput: get(doc, "masterinput") ?? [],
      name: get(doc, "name"),
      createdAt: toDate(get(doc, "CreatedAt", "createdAt")),
      lastModifiedAt: toDate(get(doc, "LastModifiedAt", "lastModifiedAt")),
      inputsections: get(doc, "inputsections") ?? [],
      newPages: get(doc, "new_pages", "newPages") ?? {},
      newMasterinput: get(doc, "new_masterinput", "newMasterinput") ?? {},
      newInputsections: get(doc, "new_inputsections", "newInputsections") ?? {},
      userid: mapRef(userMap, get(doc, "userid")),
      collaborators: mapRefArray(userMap, get(doc, "collaborators") ?? []),
      isDisabled: get(doc, "isDisabled", "is_disabled") ?? false,
      fixedparameterset: get(doc, "fixedparameterset") ?? false,
    });
  }

  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    await db.insert(directFeasibilities).values(out.slice(i, i + BATCH_SIZE)).onConflictDoNothing();
  }
  console.log(`  direct_feasibilities: ${out.length} rows`);
}

async function migrateContacts(dir, idMaps) {
  const rows = await loadCollection(dir, "contacts");
  const userMap = idMaps.users || new Map();
  const out = [];

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;

    out.push({
      id: oldId,
      createdAt: toDate(get(doc, "createdAt", "CreatedAt")),
      name: get(doc, "name"),
      phone: get(doc, "phone"),
      isDisabled: get(doc, "isDisabled", "is_disabled") ?? false,
      email: get(doc, "email"),
      type: get(doc, "type"),
      description: get(doc, "description"),
      user: mapRef(userMap, get(doc, "user")),
      files: get(doc, "files"),
      gst: get(doc, "gst"),
      pan: get(doc, "pan"),
    });
  }

  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    await db.insert(contacts).values(out.slice(i, i + BATCH_SIZE)).onConflictDoNothing();
  }
  console.log(`  contacts: ${out.length} rows`);
}

async function migrateAboutUs(dir) {
  const rows = await loadCollection(dir, "aboutus");
  const out = [];

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    out.push({
      id: oldId,
      name: get(doc, "name") ?? "",
      brief: get(doc, "brief") ?? "",
      description: get(doc, "description") ?? "",
      level: typeof get(doc, "level") === "number" ? get(doc, "level") : 0,
      photoUrl: get(doc, "photoUrl", "photo_url"),
      createdAt: toDate(get(doc, "CreatedAt", "createdAt")),
      isDisabled: get(doc, "isDisabled", "is_disabled") ?? false,
    });
  }

  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    await db.insert(aboutUs).values(out.slice(i, i + BATCH_SIZE)).onConflictDoNothing();
  }
  console.log(`  about_us: ${out.length} rows`);
}

async function migrateBills(dir, idMaps) {
  const rows = await loadCollection(dir, "bills");
  const userMap = idMaps.users || new Map();
  const out = [];

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    out.push({
      id: oldId,
      createdAt: toDate(get(doc, "createdAt", "CreatedAt")),
      form: get(doc, "form"),
      user: mapRef(userMap, get(doc, "user")),
      name: get(doc, "name"),
      client: null,
    });
  }

  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    await db.insert(bills).values(out.slice(i, i + BATCH_SIZE)).onConflictDoNothing();
  }
  console.log(`  bills: ${out.length} rows`);
}

async function migratePdfDownloadLogs(dir, idMaps) {
  const rows = await loadCollection(dir, "pdfdownloadlogs");
  const userMap = idMaps.users || new Map();
  const out = [];

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    const userRef = mapRef(userMap, get(doc, "user"));
    if (!userRef) {
      console.warn(`[pdfdownloadlogs] skipping ${oldId}: no user`);
      continue;
    }
    out.push({
      id: oldId,
      user: userRef,
      fetchId: get(doc, "fetchId", "fetch_id") ?? String(oldId),
      downloadedAt: toDate(get(doc, "downloadedAt", "downloaded_at")) ?? new Date(),
    });
  }

  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    await db.insert(pdfDownloadLogs).values(out.slice(i, i + BATCH_SIZE)).onConflictDoNothing();
  }
  console.log(`  pdf_download_logs: ${out.length} rows`);
}

async function migrateFileTemplates(dir) {
  const rows = await loadCollection(dir, "filetemplates");
  const out = [];

  for (const doc of rows) {
    const oldId = idStr(doc);
    if (!oldId) continue;
    out.push({
      id: oldId,
      name: get(doc, "name"),
      type: get(doc, "type"),
      html: get(doc, "html"),
      inputValues: get(doc, "inputValues", "input_values"),
      date: toDate(get(doc, "date")),
    });
  }

  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    await db.insert(fileTemplates).values(out.slice(i, i + BATCH_SIZE)).onConflictDoNothing();
  }
  console.log(`  file_templates: ${out.length} rows`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  console.log("Export path:", EXPORT_PATH);
  console.log("Truncate before insert:", TRUNCATE);

  if (TRUNCATE) {
    await truncateAll();
  }

  const idMaps = {};
  console.log("Migrating...");
  await migrateUsers(EXPORT_PATH, idMaps);
  await migrateTemplates(EXPORT_PATH, idMaps);
  await migrateVersions(EXPORT_PATH, idMaps);
  await migrateDirectFeasibilities(EXPORT_PATH, idMaps);
  await migrateContacts(EXPORT_PATH, idMaps);
  await migrateAboutUs(EXPORT_PATH);
  await migrateBills(EXPORT_PATH, idMaps);
  await migratePdfDownloadLogs(EXPORT_PATH, idMaps);
  await migrateFileTemplates(EXPORT_PATH);

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
