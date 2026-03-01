import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createTestDb, MIGRATIONS_FOLDER } from "../test-db-helper";

describe("local-db idempotent migrations", () => {
  it("runs migrations twice without error", () => {
    const { sqlite, db } = createTestDb();

    // Second run — should be a no-op, not an error
    expect(() => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })).not.toThrow();

    const tables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'",
      )
      .all()
      .map((row: any) => row.name);

    expect(tables.length).toBeGreaterThanOrEqual(12);

    sqlite.close();
  });
});
