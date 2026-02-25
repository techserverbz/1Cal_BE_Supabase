import "dotenv/config";
import { sql } from "drizzle-orm";
import app from "./app.js";
import { db } from "./db/index.js";

const PORT = process.env.PORT ?? 8000;

try {
  await db.execute(sql`SELECT 1`);
  console.log("Supabase connection successful");
} catch (err) {
  console.error("Supabase connection failed:", err);
  process.exit(1);
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
