import * as schema from "@ironlog/db/schema";
import { createTestDb } from "../test-db-helper";
import { pullChanges, setLastSyncCursor } from "../sync-engine";
import type { SyncClient } from "../sync-engine";

describe("LWW on pull", () => {
  function setup() {
    const { db } = createTestDb();
    db.insert(schema.user)
      .values({ id: "u-1", name: "Test", email: "t@t.com", updatedAt: new Date() })
      .run();
    return db;
  }

  it("preserves local row when local updatedAt is newer than server", () => {
    const db = setup();

    // Insert local workout with updatedAt=9000
    db.insert(schema.workouts)
      .values({
        id: "w-1",
        userId: "u-1",
        title: "Local Title",
        createdAt: new Date(1000),
        updatedAt: new Date(9000),
      })
      .run();

    const client: SyncClient = {
      sync: {
        push: { mutate: jest.fn() },
        pull: {
          query: jest.fn().mockResolvedValue({
            changes: [
              {
                table: "workouts",
                id: "w-1",
                userId: "u-1",
                title: "Server Title",
                createdAt: 1000,
                updatedAt: 5000,
                deletedAt: null,
              },
            ],
            cursor: 5000,
          }),
        },
      },
    };

    setLastSyncCursor(db, 0);

    return pullChanges(db, client).then(() => {
      const rows = db.select().from(schema.workouts).all();
      expect(rows[0].title).toBe("Local Title");
    });
  });

  it("applies server row when server updatedAt is newer than local", () => {
    const db = setup();

    // Insert local workout with updatedAt=3000
    db.insert(schema.workouts)
      .values({
        id: "w-1",
        userId: "u-1",
        title: "Local Title",
        createdAt: new Date(1000),
        updatedAt: new Date(3000),
      })
      .run();

    const client: SyncClient = {
      sync: {
        push: { mutate: jest.fn() },
        pull: {
          query: jest.fn().mockResolvedValue({
            changes: [
              {
                table: "workouts",
                id: "w-1",
                userId: "u-1",
                title: "Server Title",
                createdAt: 1000,
                updatedAt: 9000,
                deletedAt: null,
              },
            ],
            cursor: 9000,
          }),
        },
      },
    };

    setLastSyncCursor(db, 0);

    return pullChanges(db, client).then(() => {
      const rows = db.select().from(schema.workouts).all();
      expect(rows[0].title).toBe("Server Title");
    });
  });
});
