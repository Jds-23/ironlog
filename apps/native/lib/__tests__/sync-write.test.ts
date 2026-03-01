import * as schema from "@ironlog/db/schema";
import { createTestDb } from "../test-db-helper";
import { syncWrite } from "../sync-engine";

describe("syncWrite", () => {
  function setup() {
    const { db } = createTestDb();
    db.insert(schema.user)
      .values({ id: "u-1", name: "Test", email: "t@t.com", updatedAt: new Date() })
      .run();
    return db;
  }

  it("insert: writes row to workouts + enqueues in _sync_queue", () => {
    const db = setup();

    syncWrite(db, "workouts", "insert", {
      id: "w-1",
      userId: "u-1",
      title: "Push Day",
    });

    const workouts = db.select().from(schema.workouts).all();
    expect(workouts).toHaveLength(1);
    expect(workouts[0].id).toBe("w-1");
    expect(workouts[0].title).toBe("Push Day");
    expect(workouts[0].updatedAt).toBeInstanceOf(Date);

    const queue = db.select().from(schema.syncQueue).all();
    expect(queue).toHaveLength(1);
    expect(queue[0].tableName).toBe("workouts");
    expect(queue[0].recordId).toBe("w-1");
    expect(queue[0].operation).toBe("insert");

    const payload = JSON.parse(queue[0].payload);
    expect(payload.title).toBe("Push Day");
  });

  it("update: updates existing row + enqueues with operation=update", () => {
    const db = setup();

    // First insert
    syncWrite(db, "workouts", "insert", {
      id: "w-1",
      userId: "u-1",
      title: "Push Day",
    });

    // Then update
    syncWrite(db, "workouts", "update", {
      id: "w-1",
      userId: "u-1",
      title: "Pull Day",
    });

    const workouts = db.select().from(schema.workouts).all();
    expect(workouts).toHaveLength(1);
    expect(workouts[0].title).toBe("Pull Day");

    const queue = db.select().from(schema.syncQueue).all();
    expect(queue).toHaveLength(2);
    expect(queue[1].operation).toBe("update");
  });

  it("delete: sets deletedAt + enqueues with operation=delete", () => {
    const db = setup();

    // First insert
    syncWrite(db, "workouts", "insert", {
      id: "w-1",
      userId: "u-1",
      title: "Push Day",
    });

    // Then delete
    syncWrite(db, "workouts", "delete", {
      id: "w-1",
      userId: "u-1",
    });

    const workouts = db.select().from(schema.workouts).all();
    expect(workouts).toHaveLength(1);
    expect(workouts[0].deletedAt).toBeInstanceOf(Date);

    const queue = db.select().from(schema.syncQueue).all();
    expect(queue).toHaveLength(2);
    expect(queue[1].operation).toBe("delete");
  });
});
