import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const metricDefinitions = sqliteTable(
  "metric_definitions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("metric_definitions_user_id_idx").on(table.userId)],
);

export const metricDefinitionRelations = relations(metricDefinitions, ({ many }) => ({
  entries: many(metricEntries),
}));

export const metricEntries = sqliteTable(
  "metric_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    metricDefinitionId: text("metric_definition_id")
      .notNull()
      .references(() => metricDefinitions.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    value: real("value").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("metric_entries_user_id_idx").on(table.userId),
    index("metric_entries_definition_id_idx").on(table.metricDefinitionId),
    uniqueIndex("metric_entries_definition_date_idx").on(table.metricDefinitionId, table.date),
  ],
);

export const metricEntryRelations = relations(metricEntries, ({ one }) => ({
  metricDefinition: one(metricDefinitions, {
    fields: [metricEntries.metricDefinitionId],
    references: [metricDefinitions.id],
  }),
}));
