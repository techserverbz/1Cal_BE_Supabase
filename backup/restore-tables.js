/**
 * Restore tables from a backup folder (produced by export-tables.js).
 *
 * Usage:
 *   node backup/restore-tables.js <backup-folder>
 *   node backup/restore-tables.js backup/20260225_174547 --truncate
 *
 * Requires DATABASE_URL in .env. Reads manifest.json and <table>.json from the folder;
 * optionally truncates tables (--truncate), then inserts rows in batches.
 */

import "dotenv/config";
import postgres from "postgres";
import { readFile } from "fs/promises";
import { join, isAbsolute } from "path";
import { existsSync } from "fs";

const TABLES = [
  "users",
  "templates",
  "versions",
  "direct_feasibilities",
  "contacts",
  "about_us",
  "bills",
  "pdf_download_logs",
  "file_templates",
];

const BATCH_SIZE = 100;

function quoteId(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const truncate = argv.includes("--truncate");
  const folder = argv.filter((a) => a !== "--truncate")[0];
  if (!folder) {
    console.error("Usage: node backup/restore-tables.js <backup-folder> [--truncate]");
    process.exit(1);
  }
  return { folder: folder.trim(), truncate };
}

async function loadManifest(dir) {
  const path = join(dir, "manifest.json");
  if (!existsSync(path)) {
    return null;
  }
  const raw = await readFile(path, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data.tables) ? data.tables : null;
}

async function loadTableJson(dir, table) {
  const path = join(dir, `${table}.json`);
  if (!existsSync(path)) {
    return null;
  }
  const raw = await readFile(path, "utf8");
  const rows = JSON.parse(raw);
  return Array.isArray(rows) ? rows : [];
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Set it in .env or the environment.");
    process.exit(1);
  }

  const { folder, truncate } = parseArgs();
  const dir = isAbsolute(folder) ? folder : join(process.cwd(), folder);
  if (!existsSync(dir)) {
    console.error("Backup folder not found:", dir);
    process.exit(1);
  }
  console.log("Restore from:", dir);
  if (truncate) console.log("Truncate: yes");

  const tables = (await loadManifest(dir)) || TABLES;
  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    if (truncate) {
      for (const table of [...tables].reverse()) {
        const q = quoteId(table);
        await sql.unsafe(`TRUNCATE TABLE public.${q} CASCADE`);
        console.log("  truncated", table);
      }
    }

    for (const table of tables) {
      const rows = await loadTableJson(dir, table);
      if (rows === null) {
        console.warn("  skip", table, "(file missing)");
        continue;
      }
      if (rows.length === 0) {
        console.log("  skip", table, "(empty)");
        continue;
      }

      const cols = Object.keys(rows[0]);
      const quotedTable = quoteId(table);
      const quotedCols = cols.map(quoteId).join(", ");
      let inserted = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const placeholders = batch
          .map(
            (_, rowIdx) =>
              "(" +
              cols
                .map(
                  (_, colIdx) =>
                    "$" + (rowIdx * cols.length + colIdx + 1)
                )
                .join(", ") +
              ")"
          )
          .join(", ");
        const values = batch.flatMap((row) => cols.map((c) => row[c]));
        const insertSql = `INSERT INTO public.${quotedTable} (${quotedCols}) VALUES ${placeholders}`;
        await sql.unsafe(insertSql, values);
        inserted += batch.length;
      }
      console.log("  restored", table + ":", inserted, "rows");
    }
    console.log("Done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
