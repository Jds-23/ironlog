import { env } from "cloudflare:workers";
import { describe, it, expect, beforeAll } from "vitest";
import app from "../index";
import { createAllSyncTables } from "./helpers/setup-db";
import { createAuthTables, signUpTestUser, getSessionCookie } from "./helpers/setup-auth";

let cookie: string;

beforeAll(async () => {
  await createAuthTables();
  await createAllSyncTables();
  const { res } = await signUpTestUser({ email: "sync@test.com", password: "password123" });
  cookie = getSessionCookie(res)!;
});

// biome-ignore lint: test helper
async function trpcMutation(
  path: string,
  input: unknown,
  cookieOverride?: string,
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const c = cookieOverride !== undefined ? cookieOverride : cookie;
  if (c) headers["Cookie"] = c;
  const res = await app.request("/trpc/" + path, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return { status: res.status, json: await res.json() };
}

// biome-ignore lint: test helper
async function trpcQuery(
  path: string,
  input?: unknown,
  cookieOverride?: string,
): Promise<{ status: number; json: any }> {
  const url = input
    ? `/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `/trpc/${path}`;
  const headers: Record<string, string> = {};
  const c = cookieOverride !== undefined ? cookieOverride : cookie;
  if (c) headers["Cookie"] = c;
  const res = await app.request(url, { headers });
  return { status: res.status, json: await res.json() };
}

describe("sync tRPC", () => {
  it("push inserts new rows", async () => {
    const workoutId = crypto.randomUUID();
    const exerciseId = crypto.randomUUID();
    const now = Date.now();

    const { status, json } = await trpcMutation("sync.push", {
      changes: [
        {
          table: "workouts",
          id: workoutId,
          data: { title: "Push Day" },
          updatedAt: now,
        },
        {
          table: "exercises",
          id: exerciseId,
          data: { workoutId: workoutId, name: "Bench Press", order: 0 },
          updatedAt: now,
        },
      ],
    });

    expect(json).toMatchObject({ result: { data: { success: true } } });
    expect(status).toBe(200);

    // Verify rows in DB via raw SQL
    const workout = await env.DB.prepare("SELECT * FROM workouts WHERE id = ?")
      .bind(workoutId)
      .first();
    expect(workout).not.toBeNull();
    expect(workout!.title).toBe("Push Day");

    const exercise = await env.DB.prepare("SELECT * FROM exercises WHERE id = ?")
      .bind(exerciseId)
      .first();
    expect(exercise).not.toBeNull();
    expect(exercise!.name).toBe("Bench Press");
    expect(exercise!.workout_id).toBe(workoutId);
  });

  it("push updates when newer (LWW)", async () => {
    const id = crypto.randomUUID();
    const t1 = Date.now();
    const t2 = t1 + 1000;

    // Insert
    await trpcMutation("sync.push", {
      changes: [{ table: "workouts", id, data: { title: "Original" }, updatedAt: t1 }],
    });

    // Update with newer timestamp
    const { status, json } = await trpcMutation("sync.push", {
      changes: [{ table: "workouts", id, data: { title: "Updated" }, updatedAt: t2 }],
    });

    expect(status).toBe(200);
    expect(json.result.data.success).toBe(true);

    const row = await env.DB.prepare("SELECT title, updated_at FROM workouts WHERE id = ?")
      .bind(id)
      .first();
    expect(row!.title).toBe("Updated");
    expect(row!.updated_at).toBe(t2);
  });

  it("push rejects stale updates", async () => {
    const id = crypto.randomUUID();
    const t1 = Date.now();
    const t2 = t1 + 1000;

    // Insert with newer timestamp
    await trpcMutation("sync.push", {
      changes: [{ table: "workouts", id, data: { title: "Newer" }, updatedAt: t2 }],
    });

    // Attempt update with older timestamp — should be rejected
    await trpcMutation("sync.push", {
      changes: [{ table: "workouts", id, data: { title: "Stale" }, updatedAt: t1 }],
    });

    const row = await env.DB.prepare("SELECT title FROM workouts WHERE id = ?").bind(id).first();
    expect(row!.title).toBe("Newer");
  });

  it("push soft-deletes a row", async () => {
    const id = crypto.randomUUID();
    const t1 = Date.now();
    const t2 = t1 + 1000;

    await trpcMutation("sync.push", {
      changes: [{ table: "workouts", id, data: { title: "To Delete" }, updatedAt: t1 }],
    });

    // Soft delete with newer timestamp
    await trpcMutation("sync.push", {
      changes: [
        { table: "workouts", id, data: { title: "To Delete" }, updatedAt: t2, deletedAt: t2 },
      ],
    });

    const row = await env.DB.prepare("SELECT deleted_at FROM workouts WHERE id = ?")
      .bind(id)
      .first();
    expect(row!.deleted_at).toBe(t2);
  });

  it("pull returns rows newer than cursor", async () => {
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    const t1 = 1000000;
    const t2 = 2000000;

    await trpcMutation("sync.push", {
      changes: [
        { table: "workouts", id: id1, data: { title: "Old" }, updatedAt: t1 },
        { table: "workouts", id: id2, data: { title: "New" }, updatedAt: t2 },
      ],
    });

    // Pull with cursor between the two timestamps
    const { status, json } = await trpcQuery("sync.pull", { cursor: t1 });

    expect(status).toBe(200);
    const changes = json.result.data.changes;
    // Only id2 should be returned (updatedAt > cursor)
    const workoutChanges = changes.filter(
      (c: { table: string }) => c.table === "workouts" && [id1, id2].includes(c.id),
    );
    expect(workoutChanges).toHaveLength(1);
    expect(workoutChanges[0].id).toBe(id2);
    expect(workoutChanges[0].title).toBe("New");
    expect(workoutChanges[0].updatedAt).toBe(t2);
  });

  it("pull scopes to userId", async () => {
    // Create user B
    const { res: resB } = await signUpTestUser({
      email: "sync-b@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;

    const id = crypto.randomUUID();
    const now = Date.now();

    // User A pushes a workout
    await trpcMutation("sync.push", {
      changes: [{ table: "workouts", id, data: { title: "A's workout" }, updatedAt: now }],
    });

    // User B pulls — should not see A's workout
    const { status, json } = await trpcQuery("sync.pull", { cursor: 0 }, cookieB);
    expect(status).toBe(200);
    const ids = json.result.data.changes.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(id);
  });

  it("pull returns correct cursor and second pull is empty", async () => {
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    const t1 = 5000000;
    const t2 = 6000000;

    await trpcMutation("sync.push", {
      changes: [
        { table: "workouts", id: id1, data: { title: "W1" }, updatedAt: t1 },
        { table: "workouts", id: id2, data: { title: "W2" }, updatedAt: t2 },
      ],
    });

    // Pull from 0 — should get both, cursor = max updatedAt
    const { json: pull1 } = await trpcQuery("sync.pull", { cursor: 0 });
    const cursor1 = pull1.result.data.cursor;
    expect(cursor1).toBeGreaterThanOrEqual(t2);

    // Pull again with returned cursor — should be empty (for these IDs)
    const { json: pull2 } = await trpcQuery("sync.pull", { cursor: cursor1 });
    const changes2 = pull2.result.data.changes.filter(
      (c: { id: string }) => c.id === id1 || c.id === id2,
    );
    expect(changes2).toHaveLength(0);
  });
});
