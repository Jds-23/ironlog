import * as schema from "@ironlog/db/schema";
import { createTestDb } from "../test-db-helper";

describe("local-db round-trip", () => {
  it("inserts and selects a workout via drizzle", () => {
    const { db } = createTestDb();

    db.insert(schema.user)
      .values({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        updatedAt: new Date(),
      })
      .run();

    db.insert(schema.workouts)
      .values({
        id: "workout-1",
        userId: "user-1",
        title: "Push Day",
      })
      .run();

    const rows = db.select().from(schema.workouts).all();

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("workout-1");
    expect(rows[0].userId).toBe("user-1");
    expect(rows[0].title).toBe("Push Day");
  });
});
