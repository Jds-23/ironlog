import { createTestDb } from "../test-db-helper";
import { getLastSyncCursor, setLastSyncCursor } from "../sync-engine";

describe("_sync_meta cursor", () => {
  it("returns 0 when no cursor is stored", () => {
    const { db } = createTestDb();
    expect(getLastSyncCursor(db)).toBe(0);
  });

  it("stores and retrieves a cursor", () => {
    const { db } = createTestDb();
    setLastSyncCursor(db, 1234567890);
    expect(getLastSyncCursor(db)).toBe(1234567890);
  });

  it("overwrites existing cursor on re-set", () => {
    const { db } = createTestDb();
    setLastSyncCursor(db, 1000);
    setLastSyncCursor(db, 2000);
    expect(getLastSyncCursor(db)).toBe(2000);
  });
});
