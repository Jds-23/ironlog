import * as schema from "@ironlog/db/schema";
import { createTestDb } from "../test-db-helper";

describe("_sync_queue enqueue", () => {
  it("inserts and reads back a sync queue entry with correct defaults", () => {
    const { db } = createTestDb();

    const id = "sq-1";
    const now = Date.now();

    db.insert(schema.syncQueue)
      .values({
        id,
        tableName: "workouts",
        recordId: "w-1",
        operation: "insert",
        payload: JSON.stringify({ title: "Push Day" }),
        createdAt: now,
      })
      .run();

    const rows = db.select().from(schema.syncQueue).all();

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(id);
    expect(rows[0].tableName).toBe("workouts");
    expect(rows[0].recordId).toBe("w-1");
    expect(rows[0].operation).toBe("insert");
    expect(rows[0].payload).toBe(JSON.stringify({ title: "Push Day" }));
    expect(rows[0].createdAt).toBe(now);
    expect(rows[0].attempts).toBe(0);
    expect(rows[0].lastError).toBeNull();
  });
});
