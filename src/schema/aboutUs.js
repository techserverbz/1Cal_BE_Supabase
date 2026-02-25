import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const aboutUs = pgTable("about_us", {
  id: varchar("id", { length: 24 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  brief: text("brief").notNull(),
  description: text("description").notNull(),
  level: integer("level").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  isDisabled: boolean("is_disabled").default(false),
});
