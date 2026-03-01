import { env } from "cloudflare:workers";
import { describe, it, expect, beforeAll } from "vitest";
import app from "../index";
import { createWorkoutTables } from "./helpers/setup-db";
import { createAuthTables, signUpTestUser, getSessionCookie } from "./helpers/setup-auth";

let cookie: string;

beforeAll(async () => {
  await createAuthTables();
  await createWorkoutTables();
  const { res } = await signUpTestUser({ email: "workout@test.com", password: "password123" });
  cookie = getSessionCookie(res)!;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

describe("workout tRPC", () => {
  // --- auth ---
  it("unauthenticated request to privateData returns 401", async () => {
    const { status } = await trpcQuery("privateData", undefined, "");
    expect(status).toBe(401);
  });

  it("authenticated request to privateData succeeds", async () => {
    const { status, json } = await trpcQuery("privateData");
    expect(status).toBe(200);
    expect(json.result.data.message).toBe("This is private");
  });

  // --- user isolation ---
  it("workout.create stores userId, workout.list returns only user's workouts", async () => {
    // Sign up a second user
    const { res: resB } = await signUpTestUser({
      email: "workoutB@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;

    // User A creates a workout
    await trpcMutation("workout.create", { title: "A's Workout", exercises: [] });

    // User A lists → sees it
    const { json: listA } = await trpcQuery("workout.list");
    const titlesA = listA.result.data.map((w: { title: string }) => w.title);
    expect(titlesA).toContain("A's Workout");

    // User B lists → empty (B has no workouts)
    const { json: listB } = await trpcQuery("workout.list", undefined, cookieB);
    expect(listB.result.data).toEqual([]);
  });

  it("getById enforces ownership", async () => {
    const { res: resB } = await signUpTestUser({
      email: "workoutB-get@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;

    // User A creates a workout
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "A's Private",
      exercises: [{ name: "Squat", sets: [{ weight: 100, targetReps: 5 }] }],
    });
    const id = createJson.result.data.id;

    // User B tries to get it → 404
    const { status } = await trpcQuery("workout.getById", { id }, cookieB);
    expect(status).toBe(404);
  });

  it("update enforces ownership", async () => {
    const { res: resB } = await signUpTestUser({
      email: "workoutB-upd@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;

    // User A creates a workout
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "A's To Update",
      exercises: [],
    });
    const id = createJson.result.data.id;

    // User B tries to update → 404
    const { status: statusB } = await trpcMutation(
      "workout.update",
      {
        id,
        title: "Hijacked",
        exercises: [],
      },
      cookieB,
    );
    expect(statusB).toBe(404);

    // User A updates → 200
    const { status: statusA } = await trpcMutation("workout.update", {
      id,
      title: "A's Updated",
      exercises: [],
    });
    expect(statusA).toBe(200);
  });

  it("delete enforces ownership", async () => {
    const { res: resB } = await signUpTestUser({
      email: "workoutB-del@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;

    // User A creates a workout
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "A's To Delete",
      exercises: [],
    });
    const id = createJson.result.data.id;

    // User B tries to delete → 404
    const { status: statusB } = await trpcMutation("workout.delete", { id }, cookieB);
    expect(statusB).toBe(404);

    // User A still sees it
    const { status: statusA } = await trpcQuery("workout.getById", { id });
    expect(statusA).toBe(200);
  });

  // --- UUID PKs ---
  it("create returns a text UUID id", async () => {
    const { json } = await trpcMutation("workout.create", { title: "UUID Test", exercises: [] });
    const id = json.result.data.id;
    expect(typeof id).toBe("string");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("getById accepts UUID string id", async () => {
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "UUID Get",
      exercises: [{ name: "Squat", sets: [{ weight: 100, targetReps: 5 }] }],
    });
    const id = createJson.result.data.id;
    expect(id).toMatch(/^[0-9a-f]{8}-/i);

    const { status, json } = await trpcQuery("workout.getById", { id });
    expect(status).toBe(200);
    expect(json.result.data.id).toBe(id);
    expect(json.result.data.title).toBe("UUID Get");
  });

  // --- soft delete ---
  it("list excludes soft-deleted workouts", async () => {
    const { res: resF } = await signUpTestUser({
      email: "workout-softdel@test.com",
      password: "password123",
    });
    const cookieF = getSessionCookie(resF)!;

    // Create 2 workouts
    await trpcMutation("workout.create", { title: "Keep", exercises: [] }, cookieF);
    const { json: c2 } = await trpcMutation(
      "workout.create",
      { title: "Delete", exercises: [] },
      cookieF,
    );
    const deleteId = c2.result.data.id;

    // Soft-delete one via raw SQL
    await env.DB.exec(`UPDATE workouts SET deleted_at = ${Date.now()} WHERE id = '${deleteId}'`);

    // List should return only the non-deleted workout
    const { json: listJson } = await trpcQuery("workout.list", undefined, cookieF);
    const titles = listJson.result.data.map((w: { title: string }) => w.title);
    expect(titles).toContain("Keep");
    expect(titles).not.toContain("Delete");
    expect(listJson.result.data).toHaveLength(1);
  });

  it("delete sets deletedAt instead of hard delete", async () => {
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "Soft Delete Me",
      exercises: [],
    });
    const id = createJson.result.data.id;

    // Delete via router
    const { status } = await trpcMutation("workout.delete", { id });
    expect(status).toBe(200);

    // getById should return 404
    const { status: getStatus } = await trpcQuery("workout.getById", { id });
    expect(getStatus).toBe(404);

    // But row still exists in DB with deletedAt set
    const row = await env.DB.prepare("SELECT id, deleted_at FROM workouts WHERE id = ?")
      .bind(id)
      .first();
    expect(row).not.toBeNull();
    expect(row!.deleted_at).not.toBeNull();
  });

  // --- list ---
  it("list returns empty array initially", async () => {
    const { status, json } = await trpcQuery("workout.list");
    expect(status).toBe(200);
    expect(json.result.data).toEqual([]);
  });

  // --- create ---
  it("create with exercises and sets", async () => {
    const { status, json } = await trpcMutation("workout.create", {
      title: "Push Day",
      exercises: [
        {
          name: "Bench Press",
          sets: [
            { weight: 135, targetReps: 8 },
            { weight: 155, targetReps: 6 },
          ],
        },
        {
          name: "Overhead Press",
          sets: [{ weight: 95, targetReps: 10 }],
        },
      ],
    });
    expect(status).toBe(200);
    const workout = json.result.data;
    expect(workout.title).toBe("Push Day");
    expect(workout.exercises).toHaveLength(2);
    expect(workout.exercises[0].name).toBe("Bench Press");
    expect(workout.exercises[0].setTemplates).toHaveLength(2);
    expect(workout.exercises[0].setTemplates[0].weight).toBe(135);
    expect(workout.exercises[0].setTemplates[0].targetReps).toBe(8);
    expect(workout.exercises[1].name).toBe("Overhead Press");
    expect(workout.exercises[1].setTemplates).toHaveLength(1);
  });

  it("create with zero exercises succeeds", async () => {
    const { status, json } = await trpcMutation("workout.create", {
      title: "Empty Workout",
      exercises: [],
    });
    expect(status).toBe(200);
    const workout = json.result.data;
    expect(workout.title).toBe("Empty Workout");
    expect(workout.exercises).toHaveLength(0);
  });

  it("create with null weight and targetReps", async () => {
    const { status, json } = await trpcMutation("workout.create", {
      title: "Bodyweight",
      exercises: [
        {
          name: "Pull-ups",
          sets: [{ weight: null, targetReps: null }],
        },
      ],
    });
    expect(status).toBe(200);
    const set = json.result.data.exercises[0].setTemplates[0];
    expect(set.weight).toBeNull();
    expect(set.targetReps).toBeNull();
  });

  it("create with blank title returns 400", async () => {
    const { status } = await trpcMutation("workout.create", {
      title: "   ",
      exercises: [],
    });
    expect(status).toBe(400);
  });

  // --- list with data ---
  it("list returns workouts ordered by createdAt desc", async () => {
    // Create workouts within the test to ensure data exists
    await trpcMutation("workout.create", { title: "First", exercises: [] });
    await trpcMutation("workout.create", { title: "Second", exercises: [] });
    await trpcMutation("workout.create", { title: "Third", exercises: [] });

    const { json } = await trpcQuery("workout.list");
    const data = json.result.data as { id: string; title: string; createdAt: string }[];
    expect(data.length).toBeGreaterThanOrEqual(3);
    // createdAt should be in descending order (most recent first)
    for (let i = 1; i < data.length; i++) {
      expect(new Date(data[i - 1]!.createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(data[i]!.createdAt).getTime(),
      );
    }
  });

  // --- getById ---
  it("getById returns nested workout", async () => {
    // Create a workout to get
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "Get Test",
      exercises: [{ name: "Squat", sets: [{ weight: 225, targetReps: 5 }] }],
    });
    const id = createJson.result.data.id;

    const { status, json } = await trpcQuery("workout.getById", { id });
    expect(status).toBe(200);
    expect(json.result.data.title).toBe("Get Test");
    expect(json.result.data.exercises[0].name).toBe("Squat");
    expect(json.result.data.exercises[0].setTemplates[0].weight).toBe(225);
  });

  it("getById with non-existent id returns 404", async () => {
    const { status } = await trpcQuery("workout.getById", { id: "non-existent-id" });
    expect(status).toBe(404);
  });

  // --- delete ---
  it("delete removes workout", async () => {
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "To Delete",
      exercises: [{ name: "Deadlift", sets: [{ weight: 315, targetReps: 3 }] }],
    });
    const id = createJson.result.data.id;

    const { status } = await trpcMutation("workout.delete", { id });
    expect(status).toBe(200);

    // Verify it's gone
    const { status: getStatus } = await trpcQuery("workout.getById", { id });
    expect(getStatus).toBe(404);
  });

  it("delete non-existent id returns 404", async () => {
    const { status } = await trpcMutation("workout.delete", { id: "non-existent-id" });
    expect(status).toBe(404);
  });

  // --- update ---
  it("update replaces title and exercises/sets", async () => {
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "Original",
      exercises: [{ name: "Bench", sets: [{ weight: 135, targetReps: 8 }] }],
    });
    const id = createJson.result.data.id;

    const { status, json } = await trpcMutation("workout.update", {
      id,
      title: "Updated",
      exercises: [
        { name: "Squat", sets: [{ weight: 225, targetReps: 5 }] },
        { name: "Lunge", sets: [] },
      ],
    });
    expect(status).toBe(200);
    const workout = json.result.data;
    expect(workout.title).toBe("Updated");
    expect(workout.exercises).toHaveLength(2);
    expect(workout.exercises[0].name).toBe("Squat");
    expect(workout.exercises[1].name).toBe("Lunge");
    expect(workout.exercises[1].setTemplates).toHaveLength(0);
  });

  it("update non-existent id returns 404", async () => {
    const { status } = await trpcMutation("workout.update", {
      id: "non-existent-id",
      title: "Nope",
      exercises: [],
    });
    expect(status).toBe(404);
  });

  it("update to zero exercises", async () => {
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "Has Exercises",
      exercises: [{ name: "Curl", sets: [{ weight: 30, targetReps: 12 }] }],
    });
    const id = createJson.result.data.id;

    const { status, json } = await trpcMutation("workout.update", {
      id,
      title: "No Exercises",
      exercises: [],
    });
    expect(status).toBe(200);
    expect(json.result.data.exercises).toHaveLength(0);
  });

  it("list returns exercises and sets ordered by order field", async () => {
    // Create a workout with multiple exercises/sets to verify ordering
    const { json: createJson } = await trpcMutation("workout.create", {
      title: "Ordered",
      exercises: [
        {
          name: "First",
          sets: [
            { weight: 100, targetReps: 10 },
            { weight: 110, targetReps: 8 },
          ],
        },
        { name: "Second", sets: [{ weight: 50, targetReps: 15 }] },
      ],
    });
    const id = createJson.result.data.id;

    const { json } = await trpcQuery("workout.getById", { id });
    const workout = json.result.data;
    expect(workout.exercises[0].name).toBe("First");
    expect(workout.exercises[1].name).toBe("Second");
    expect(workout.exercises[0].setTemplates[0].weight).toBe(100);
    expect(workout.exercises[0].setTemplates[1].weight).toBe(110);
  });
});
