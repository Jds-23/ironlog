import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import * as schema from "@ironlog/db/schema";

export const MIGRATIONS_FOLDER = path.resolve(
  __dirname,
  "../../../packages/db/src/local-migrations",
);

export const MIGRATION_SQL_PATH = path.resolve(MIGRATIONS_FOLDER, "0000_smooth_orphan.sql");

/** Run raw SQL statements from the migration file (no migration tracking). */
export function runRawMigrations(db: InstanceType<typeof Database>) {
  const sql = fs.readFileSync(MIGRATION_SQL_PATH, "utf-8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    db.exec(stmt);
  }
}

/** Create an in-memory better-sqlite3 drizzle instance with migrations applied. */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { sqlite, db };
}
