import { eq, inArray, sql } from "drizzle-orm";
import {
  syncMeta,
  syncQueue,
  workouts,
  exercises,
  setTemplates,
  sessions,
  loggedExercises,
  loggedSets,
  metricDefinitions,
  metricEntries,
} from "@ironlog/db/schema";

const localTableRegistry: Record<string, any> = {
  workouts,
  exercises,
  setTemplates,
  sessions,
  loggedExercises,
  loggedSets,
  metricDefinitions,
  metricEntries,
};

const timestampFields = ["createdAt", "updatedAt", "deletedAt", "startedAt", "finishedAt"];

type DrizzleDb = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  delete: (...args: any[]) => any;
  transaction: (fn: (tx: DrizzleDb) => void) => void;
};

export interface ChangeItem {
  table: string;
  id: string;
  data: Record<string, unknown>;
  updatedAt: number;
  deletedAt?: number;
}

export interface PulledChange {
  table: string;
  [key: string]: unknown;
}

export interface SyncClient {
  sync: {
    push: { mutate(input: { changes: ChangeItem[] }): Promise<{ success: boolean }> };
    pull: {
      query(input: { cursor: number }): Promise<{ changes: PulledChange[]; cursor: number }>;
    };
  };
}

const CURSOR_KEY = "lastSyncCursor";

export function getLastSyncCursor(db: DrizzleDb): number {
  const row = db.select().from(syncMeta).where(eq(syncMeta.key, CURSOR_KEY)).get();
  return row ? Number(row.value) : 0;
}

export function setLastSyncCursor(db: DrizzleDb, cursor: number): void {
  db.insert(syncMeta)
    .values({ key: CURSOR_KEY, value: String(cursor) })
    .onConflictDoUpdate({
      target: syncMeta.key,
      set: { value: String(cursor) },
    })
    .run();
}

export async function pushChanges(db: DrizzleDb, client: SyncClient): Promise<void> {
  const entries = db.select().from(syncQueue).all();
  if (entries.length === 0) return;

  const changes: ChangeItem[] = entries.map((entry: any) => {
    const data = JSON.parse(entry.payload);
    return {
      table: entry.tableName,
      id: entry.recordId,
      data,
      updatedAt: entry.createdAt,
      deletedAt: data.deletedAt,
    };
  });

  const ids = entries.map((e: any) => e.id as string);

  try {
    await client.sync.push.mutate({ changes });
    db.delete(syncQueue).where(inArray(syncQueue.id, ids)).run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.update(syncQueue)
      .set({
        attempts: sql`${syncQueue.attempts} + 1`,
        lastError: msg,
      })
      .where(inArray(syncQueue.id, ids))
      .run();
    throw err;
  }
}

function prepareRowForInsert(change: PulledChange): Record<string, unknown> {
  const { table: _table, ...row } = change;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (timestampFields.includes(key) && typeof value === "number") {
      result[key] = new Date(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function pullChanges(db: DrizzleDb, client: SyncClient): Promise<void> {
  const cursor = getLastSyncCursor(db);
  const { changes, cursor: newCursor } = await client.sync.pull.query({ cursor });

  for (const change of changes) {
    const tableName = change.table as string;
    const table = localTableRegistry[tableName];
    if (!table) continue;

    const row = prepareRowForInsert(change);
    const id = row.id as string;

    const existing = db.select().from(table).where(eq(table.id, id)).get();

    if (!existing) {
      db.insert(table).values(row).run();
    } else {
      const incomingUpdatedAt = typeof change.updatedAt === "number" ? change.updatedAt : 0;
      const existingUpdatedAt =
        existing.updatedAt instanceof Date
          ? existing.updatedAt.getTime()
          : (existing.updatedAt ?? 0);

      if (incomingUpdatedAt > existingUpdatedAt) {
        db.update(table).set(row).where(eq(table.id, id)).run();
      }
    }
  }

  if (newCursor > cursor) {
    setLastSyncCursor(db, newCursor);
  }
}

export function syncWrite(
  db: DrizzleDb,
  tableName: string,
  operation: "insert" | "update" | "delete",
  data: Record<string, unknown>,
): void {
  const table = localTableRegistry[tableName];
  if (!table) throw new Error(`Unknown table: ${tableName}`);

  const now = new Date();
  const nowMs = now.getTime();
  const id = data.id as string;

  db.transaction((tx: DrizzleDb) => {
    if (operation === "insert") {
      tx.insert(table)
        .values({ ...data, createdAt: now, updatedAt: now })
        .run();
    } else if (operation === "update") {
      tx.update(table)
        .set({ ...data, updatedAt: now })
        .where(eq(table.id, id))
        .run();
    } else if (operation === "delete") {
      tx.update(table).set({ deletedAt: now, updatedAt: now }).where(eq(table.id, id)).run();
    }

    const payload: Record<string, unknown> = { ...data, updatedAt: nowMs };
    if (operation === "delete") {
      payload.deletedAt = nowMs;
    }

    tx.insert(syncQueue)
      .values({
        id: crypto.randomUUID(),
        tableName,
        recordId: id,
        operation,
        payload: JSON.stringify(payload),
        createdAt: nowMs,
      })
      .run();
  });
}

const DEBOUNCE_MS = 1000;

export function createSyncScheduler(syncFn: () => Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function notifyWrite() {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      syncFn();
    }, DEBOUNCE_MS);
  }

  function triggerNow() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    syncFn();
  }

  function cleanup() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { notifyWrite, triggerNow, cleanup };
}

function isUnauthorized(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code: string }).code === "UNAUTHORIZED";
  }
  return false;
}

export async function runSyncWithRetry(
  db: DrizzleDb,
  client: SyncClient,
  refreshSession: () => Promise<unknown>,
): Promise<void> {
  try {
    await pushChanges(db, client);
    await pullChanges(db, client);
  } catch (err) {
    if (!isUnauthorized(err)) throw err;

    await refreshSession();

    // Retry once
    await pushChanges(db, client);
    await pullChanges(db, client);
  }
}
