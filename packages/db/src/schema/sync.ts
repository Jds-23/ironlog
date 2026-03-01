import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const syncQueue = sqliteTable("_sync_queue", {
  id: text("id").primaryKey(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  operation: text("operation", { enum: ["insert", "update", "delete"] }).notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
});

export const syncMeta = sqliteTable("_sync_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
