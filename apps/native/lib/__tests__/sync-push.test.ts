import * as schema from "@ironlog/db/schema";
import { createTestDb } from "../test-db-helper";
import { pushChanges } from "../sync-engine";
import type { SyncClient } from "../sync-engine";

describe("pushChanges", () => {
  it("sends queued entries to server and clears queue on success", () => {
    const { db } = createTestDb();

    // Seed 2 queue entries
    db.insert(schema.syncQueue)
      .values([
        {
          id: "sq-1",
          tableName: "workouts",
          recordId: "w-1",
          operation: "insert",
          payload: JSON.stringify({ id: "w-1", userId: "u-1", title: "Push Day" }),
          createdAt: 1000,
        },
        {
          id: "sq-2",
          tableName: "exercises",
          recordId: "e-1",
          operation: "update",
          payload: JSON.stringify({ id: "e-1", userId: "u-1", name: "Bench Press" }),
          createdAt: 2000,
        },
      ])
      .run();

    const mockMutate = jest.fn().mockResolvedValue({ success: true });
    const client: SyncClient = {
      sync: {
        push: { mutate: mockMutate },
        pull: { query: jest.fn() },
      },
    };

    return pushChanges(db, client).then(() => {
      // Verify client called with correct shape
      expect(mockMutate).toHaveBeenCalledTimes(1);
      const arg = mockMutate.mock.calls[0][0];
      expect(arg.changes).toHaveLength(2);
      expect(arg.changes[0]).toMatchObject({
        table: "workouts",
        id: "w-1",
        data: { id: "w-1", userId: "u-1", title: "Push Day" },
        updatedAt: expect.any(Number),
      });
      expect(arg.changes[1]).toMatchObject({
        table: "exercises",
        id: "e-1",
        data: { id: "e-1", userId: "u-1", name: "Bench Press" },
        updatedAt: expect.any(Number),
      });

      // Verify queue cleared
      const remaining = db.select().from(schema.syncQueue).all();
      expect(remaining).toHaveLength(0);
    });
  });

  it("does nothing when queue is empty", () => {
    const { db } = createTestDb();

    const mockMutate = jest.fn();
    const client: SyncClient = {
      sync: {
        push: { mutate: mockMutate },
        pull: { query: jest.fn() },
      },
    };

    return pushChanges(db, client).then(() => {
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});
