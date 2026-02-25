# Migration Guide: MongoDB to Supabase (Postgres)

This document describes how to migrate the backend from MongoDB to Supabase/Postgres: applying schema migrations and loading data from a MongoDB export.

---

## Prerequisites

- **Node.js** (project uses ES modules).
- **Environment**: Set `DATABASE_URL` to your Supabase Postgres connection string (e.g. in `.env`).
- **MongoDB export** (for data migration): either JSON arrays or BSON from `mongodump`.

---

## 1. Schema migrations (Drizzle)

Schema changes are applied with Drizzle’s migrator. This creates/updates tables in Postgres.

### Command

```bash
npm run db:migrate
```

Or directly:

```bash
node src/migrate.js
```

### What it does

- Reads migrations from the `drizzle/` folder.
- Runs each migration SQL file in order against the database pointed to by `DATABASE_URL`.
- Requires `DATABASE_URL` to be set; exits with an error if missing.

### When to run

- **First time**: After cloning and before loading data.
- **After schema changes**: When new Drizzle migrations are added (e.g. after `npm run db:generate` and committing new files in `drizzle/`).

---

## 2. Data migration (MongoDB → Postgres)

The script `scripts/migrate-mongo-to-pg.js` reads a MongoDB export, maps fields to the Postgres schema, and inserts rows in foreign-key order.

### Export path

- **Default**: `../Feasibility_2026-02-24_14-18-35/Hello` (relative to project root).
- **Override**: Set `MONGO_EXPORT_PATH` or pass the path as the first CLI argument.

### Export format

The export folder must contain **one of**:

**Option A – JSON (e.g. from `mongoexport`)**

- One file per collection, each file a JSON array.
- Expected filenames: `users.json`, `templates.json`, `versions.json`, `formulatemplates.json`, `contacts.json`, `aboutus.json`, `bills.json`, `pdfdownloadlogs.json`, `filetemplates.json`.

**Option B – BSON (from `mongodump`)**

- Same base names with `.bson` extension: `users.bson`, `templates.bson`, etc.
- The script parses BSON and inserts into Postgres.

### Commands

**Use default export path**

```bash
npm run migrate:mongo
```

**Use a specific export folder**

```bash
npm run migrate:mongo -- "../path/to/export/folder"
```

**Truncate Postgres tables first, then load (full replace)**

```bash
npm run migrate:mongo -- "../path/to/export" --truncate
```

Tables are truncated in reverse FK order (e.g. `pdf_download_logs` → … → `users`) so constraints are satisfied.

**Using environment variable for path**

```bash
MONGO_EXPORT_PATH=../my-export npm run migrate:mongo
```

### Migration order (data script)

Data is inserted in this order to respect foreign keys:

1. `users`
2. `templates`
3. `versions`
4. `direct_feasibilities` (from `formulatemplates`)
5. `contacts`
6. `about_us`
7. `bills`
8. `pdf_download_logs`
9. `file_templates`

### Behaviour

- **IDs**: MongoDB `_id` (ObjectId or string) is kept as the primary key string in Postgres (24-char compatible).
- **References**: User/template/version references are mapped so existing relationships are preserved.
- **Timestamps**: `date`, `createdAt`, `lastModifiedAt`, etc. are converted to `Date` and inserted as Postgres timestamps.
- **Conflicts**: Inserts use `onConflictDoNothing()`; duplicate IDs are skipped.
- **Batch size**: Inserts are done in batches of 100 rows.

---

## 3. End-to-end migration steps

1. **Export from MongoDB** (if you haven’t already):
   - JSON: e.g. `mongoexport --db=YourDB --collection=users --out=users.json` (repeat per collection), then place files in one folder.
   - Or BSON: `mongodump --db=YourDB --out=./dump`, then use the folder that contains the `.bson` files (e.g. `./dump/YourDB/`).

2. **Configure Postgres**:
   - Create a Supabase project and get the Postgres connection string.
   - Set `DATABASE_URL` in `.env` (or in the environment).

3. **Apply schema**:
   ```bash
   npm run db:migrate
   ```

4. **Load data**:
   - First time (empty DB):
     ```bash
     npm run migrate:mongo -- "/path/to/mongo/export"
     ```
   - Replace existing data (truncate then load):
     ```bash
     npm run migrate:mongo -- "/path/to/mongo/export" --truncate
     ```

5. **Verify**: Use the app or `npm run db:studio` to confirm data in Supabase.

---

## 4. Other DB-related commands

| Command | Description |
|--------|-------------|
| `npm run db:push` | Push schema from Drizzle config to DB (no migration files). |
| `npm run db:generate` | Generate new migration files from schema changes. |
| `npm run db:studio` | Open Drizzle Studio to browse/edit the database. |
| `npm run backup` | Export tables (see `backup/export-tables.js`). |
| `npm run restore` | Restore from backup (see `backup/restore-tables.js`). |

---

## 5. Troubleshooting

- **`DATABASE_URL is not set`**  
  Set it in `.env` or in the shell before running `db:migrate` or `migrate:mongo`.

- **`[skip] users.json / users.bson not found`**  
  The script expects files inside the export path. Ensure the path points to the folder that contains `users.json` (or `users.bson`), etc.

- **Foreign key / constraint errors**  
  Run with `--truncate` so tables are cleared in the right order, then run the migration again. Or run schema migrations first and ensure no leftover data violates new constraints.

- **Duplicate key or conflict**  
  The script uses `onConflictDoNothing()`. To replace data, use `--truncate` and then run the migration again.
