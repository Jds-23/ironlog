import * as schema from "@ironlog/db/schema";
import { createTestDb } from "../test-db-helper";
import { runSyncWithRetry } from "../sync-engine";
import type { SyncClient } from "../sync-engine";

function seedQueue(db: any) {
  db.insert(schema.syncQueue)
    .values({
      id: "sq-1",
      tableName: "workouts",
      recordId: "w-1",
      operation: "insert",
      payload: JSON.stringify({ id: "w-1", userId: "u-1", title: "Push Day" }),
      createdAt: Date.now(),
    })
    .run();
}

describe("runSyncWithRetry", () => {
  it("retries once after UNAUTHORIZED, then succeeds", async () => {
    const { db } = createTestDb();
    seedQueue(db);

    const mockMutate = jest
      .fn()
      .mockRejectedValueOnce({ code: "UNAUTHORIZED" })
      .mockResolvedValueOnce({ success: true });

    const mockQuery = jest.fn().mockResolvedValue({ changes: [], cursor: 0 });

    const client: SyncClient = {
      sync: {
        push: { mutate: mockMutate },
        pull: { query: mockQuery },
      },
    };

    const refreshSession = jest.fn().mockResolvedValue(undefined);

    await runSyncWithRetry(db, client, refreshSession);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledTimes(2);
  });

  it("throws after both attempts fail with UNAUTHORIZED", async () => {
    const { db } = createTestDb();
    seedQueue(db);

    const unauthorizedError = { code: "UNAUTHORIZED" };
    const mockMutate = jest.fn().mockRejectedValue(unauthorizedError);
    const mockQuery = jest.fn().mockResolvedValue({ changes: [], cursor: 0 });

    const client: SyncClient = {
      sync: {
        push: { mutate: mockMutate },
        pull: { query: mockQuery },
      },
    };

    const refreshSession = jest.fn().mockResolvedValue(undefined);

    await expect(runSyncWithRetry(db, client, refreshSession)).rejects.toEqual(unauthorizedError);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledTimes(2);
  });
});
