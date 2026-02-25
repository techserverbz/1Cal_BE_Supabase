import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
const dbSchema = process.env.DB_SCHEMA ?? "final";
if (!connectionString) {
  throw new Error("DATABASE_URL is required for drizzle-kit. Set it in .env");
}

export default defineConfig({
  dialect: "postgresql",
  migrations: { schema: dbSchema },
  schema: [
    "./src/schema/users.js",
    "./src/schema/templates.js",
    "./src/schema/versions.js",
    "./src/schema/directFeasibilities.js",
    "./src/schema/contacts.js",
    "./src/schema/aboutUs.js",
    "./src/schema/bills.js",
    "./src/schema/pdfDownloadLogs.js",
    "./src/schema/fileTemplates.js",
  ],
  out: "./drizzle",
  dbCredentials: {
    url: connectionString,
  },
});
