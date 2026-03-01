import Database from "better-sqlite3";
import { runRawMigrations } from "../test-db-helper";

const EXPECTED_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "workouts",
  "exercises",
  "set_templates",
  "sessions",
  "logged_exercises",
  "logged_sets",
  "metric_definitions",
  "metric_entries",
];

describe("local-db migrations", () => {
  it("creates all expected tables from migration SQL", () => {
    const db = new Database(":memory:");

    runRawMigrations(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row: any) => row.name)
      .sort();

    for (const table of EXPECTED_TABLES) {
      expect(tables).toContain(table);
    }

    db.close();
  });
});
