# MongoDB export folder

Place your MongoDB export files here before running the migration script.

**Required files** (each must be a JSON array of documents):

- `users.json`
- `templates.json`
- `versions.json`
- `formulatemplates.json`
- `contacts.json`
- `aboutus.json`
- `bills.json`
- `pdfdownloadlogs.json`
- `filetemplates.json`

**Export from MongoDB** (example with mongoexport):

```bash
# Replace MONGO_URI and DB_NAME
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=users --out=users.json --jsonArray
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=templates --out=templates.json --jsonArray
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=versions --out=versions.json --jsonArray
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=formulatemplates --out=formulatemplates.json --jsonArray
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=contacts --out=contacts.json --jsonArray
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=aboutus --out=aboutus.json --jsonArray
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=bills --out=bills.json --jsonArray
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=pdfdownloadlogs --out=pdfdownloadlogs.json --jsonArray
mongoexport --uri="<MONGO_URI>" --db=<DB_NAME> --collection=filetemplates --out=filetemplates.json --jsonArray
```

Or use MongoDB Compass: export each collection as JSON (array format) and save with the names above.

Then from `BE Supabase` run:

```bash
npm run migrate:mongo
# or with truncate (wipes target tables first):
npm run migrate:mongo -- --truncate
```
