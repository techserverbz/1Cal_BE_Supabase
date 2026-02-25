-- Truncate all tables (reverse FK order) so we can change uuid to varchar(24)
TRUNCATE TABLE "pdf_download_logs", "bills", "contacts", "direct_feasibilities", "versions", "templates", "file_templates", "about_us", "users" CASCADE;

-- users
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "id" TYPE varchar(24);

-- templates
ALTER TABLE "templates" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "templates" ALTER COLUMN "id" TYPE varchar(24);
ALTER TABLE "templates" ALTER COLUMN "template_id" TYPE varchar(24);
ALTER TABLE "templates" ALTER COLUMN "userid" TYPE varchar(24);
ALTER TABLE "templates" ALTER COLUMN "currentversion" TYPE varchar(24);
ALTER TABLE "templates" ALTER COLUMN "publishid" TYPE varchar(24);

-- versions
ALTER TABLE "versions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "versions" ALTER COLUMN "id" TYPE varchar(24);
ALTER TABLE "versions" ALTER COLUMN "template_id" TYPE varchar(24);
ALTER TABLE "versions" ALTER COLUMN "versionof" TYPE varchar(24);

-- direct_feasibilities
ALTER TABLE "direct_feasibilities" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "direct_feasibilities" ALTER COLUMN "id" TYPE varchar(24);
ALTER TABLE "direct_feasibilities" ALTER COLUMN "template_id" TYPE varchar(24);
ALTER TABLE "direct_feasibilities" ALTER COLUMN "userid" TYPE varchar(24);

-- contacts
ALTER TABLE "contacts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "contacts" ALTER COLUMN "id" TYPE varchar(24);
ALTER TABLE "contacts" ALTER COLUMN "user" TYPE varchar(24);

-- about_us
ALTER TABLE "about_us" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "about_us" ALTER COLUMN "id" TYPE varchar(24);

-- bills
ALTER TABLE "bills" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "bills" ALTER COLUMN "id" TYPE varchar(24);
ALTER TABLE "bills" ALTER COLUMN "user" TYPE varchar(24);
ALTER TABLE "bills" ALTER COLUMN "client" TYPE varchar(24);

-- pdf_download_logs
ALTER TABLE "pdf_download_logs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "pdf_download_logs" ALTER COLUMN "id" TYPE varchar(24);
ALTER TABLE "pdf_download_logs" ALTER COLUMN "user" TYPE varchar(24);

-- file_templates
ALTER TABLE "file_templates" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "file_templates" ALTER COLUMN "id" TYPE varchar(24);
