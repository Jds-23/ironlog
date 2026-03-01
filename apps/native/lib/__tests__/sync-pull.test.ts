import * as schema from "@ironlog/db/schema";
import { createTestDb } from "../test-db-helper";
import { pullChanges, setLastSyncCursor, getLastSyncCursor } from "../sync-engine";
import type { SyncClient } from "../sync-engine";

describe("pullChanges", () => {
  it("inserts pulled workout into local table and updates cursor", () => {
    const { db } = createTestDb();

    // Need a user for FK constraint
    db.insert(schema.user)
      .values({ id: "u-1", name: "Test", email: "t@t.com", updatedAt: new Date() })
      .run();

    const mockQuery = jest.fn().mockResolvedValue({
      changes: [
        {
          table: "workouts",
          id: "w-1",
          userId: "u-1",
          title: "Pull Day",
          createdAt: 5000,
          updatedAt: 5000,
          deletedAt: null,
        },
      ],
      cursor: 5000,
    });

    const client: SyncClient = {
      sync: {
        push: { mutate: jest.fn() },
        pull: { query: mockQuery },
      },
    };

    setLastSyncCursor(db, 0);

    return pullChanges(db, client).then(() => {
      // Verify query called with cursor
      expect(mockQuery).toHaveBeenCalledWith({ cursor: 0 });

      // Verify workout inserted locally
      const workouts = db.select().from(schema.workouts).all();
      expect(workouts).toHaveLength(1);
      expect(workouts[0].id).toBe("w-1");
      expect(workouts[0].title).toBe("Pull Day");

      // Verify cursor updated
      expect(getLastSyncCursor(db)).toBe(5000);
    });
  });
});
