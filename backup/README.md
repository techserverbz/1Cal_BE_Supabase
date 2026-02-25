# Database backup

Export all public tables from the database (using `DATABASE_URL` in `.env`) to JSON files.

## Usage

From the project root:

```bash
npm run backup
```

This creates a timestamped folder under `backup/` (e.g. `backup/20260225_143022/`) with one `.json` file per table and a `manifest.json`.

To write to a specific folder:

```bash
node backup/export-tables.js --dir backup/my-backup
```

## Requirements

- `DATABASE_URL` set in `.env` (or in the environment) — same URL you use for the app (Supabase/Postgres connection string).

## Output

- `backup/<timestamp>/<table>.json` — JSON array of all rows for that table.
- `backup/<timestamp>/manifest.json` — export time and list of tables (no secrets).

Tables exported: `users`, `templates`, `versions`, `direct_feasibilities`, `contacts`, `about_us`, `bills`, `pdf_download_logs`, `file_templates`.

---

## Restore

Restore from a backup folder into the database (uses `DATABASE_URL` from `.env` — point it at the target DB).

```bash
npm run restore -- backup/20260225_174547
```

To clear tables before restoring (clean restore):

```bash
npm run restore -- backup/20260225_174547 --truncate
```

The backup folder must contain `manifest.json` and the `<table>.json` files produced by the export script. Missing table files are skipped with a warning.
