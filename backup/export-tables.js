/**
 * Export all public tables from DATABASE_URL to JSON files.
 *
 * Usage:
 *   node backup/export-tables.js
 *   node backup/export-tables.js --dir backup/my-backup
 *
 * Requires DATABASE_URL in .env (or environment). Writes one .json file per table
 * into backup/<timestamp>/ (or --dir path). Each file is a JSON array of rows.
 */

import "dotenv/config";
import postgres from "postgres";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Set it in .env or the environment.");
  process.exit(1);
}

const argv = process.argv.slice(2);
const customDir = argv.includes("--dir") ? argv[argv.indexOf("--dir") + 1] : null;

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

function timestamp() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    "_",
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join("");
}

async function main() {
  const outDir = customDir || join(process.cwd(), "backup", timestamp());
  await mkdir(outDir, { recursive: true });
  console.log("Output directory:", outDir);

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    for (const table of TABLES) {
      const quoted = '"' + String(table).replace(/"/g, '""') + '"';
      const rows = await sql.unsafe(`SELECT * FROM public.${quoted}`);
      const path = join(outDir, `${table}.json`);
      await writeFile(path, JSON.stringify(rows, null, 2), "utf8");
      console.log(`${table}: ${rows.length} rows -> ${path}`);
    }
    const manifest = {
      exported_at: new Date().toISOString(),
      database_url_redacted: connectionString.replace(/:[^:@]+@/, ":****@"),
      tables: TABLES,
    };
    await writeFile(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    console.log("Done. Manifest written to manifest.json");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
