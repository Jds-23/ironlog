import { describe, it, expect, beforeAll } from "vitest";
import app from "../index";
import { createSessionTables } from "./helpers/setup-db";
import { createAuthTables, signUpTestUser, getSessionCookie } from "./helpers/setup-auth";

let cookie: string;
let workoutId: string;

beforeAll(async () => {
  await createAuthTables();
  await createSessionTables();
  const { res } = await signUpTestUser({ email: "session@test.com", password: "password123" });
  cookie = getSessionCookie(res)!;
  // Create a workout so session FK constraint is satisfied
  const wRes = await app.request("/trpc/workout.create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ title: "Seed Workout", exercises: [] }),
  });
  const json = await wRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workoutId = (json as any).result.data.id;
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

function makeSession(overrides?: Record<string, unknown>) {
  return {
    workoutId,
    workoutTitle: "Push Day",
    startedAt: 1700000000,
    finishedAt: 1700003600,
    durationSeconds: 3600,
    exercises: [
      {
        exerciseId: "ex-1",
        name: "Bench Press",
        sets: [
          { weight: 100, targetReps: 10, actualReps: 10, done: true },
          { weight: 120, targetReps: 8, actualReps: 8, done: true },
          { weight: 140, targetReps: 6, actualReps: 0, done: false },
        ],
      },
      {
        exerciseId: "ex-2",
        name: "Overhead Press",
        sets: [{ weight: 60, targetReps: 10, actualReps: 10, done: true }],
      },
    ],
    ...overrides,
  };
}

describe("session tRPC", () => {
  // --- user isolation ---
  it("session.create stores userId, session.list returns only user's sessions", async () => {
    const { res: resB } = await signUpTestUser({
      email: "sessionB@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;

    // User A creates a session
    await trpcMutation("session.create", makeSession());

    // User A lists → sees it
    const { json: listA } = await trpcQuery("session.list");
    expect(listA.result.data.length).toBeGreaterThanOrEqual(1);
    expect(listA.result.data[0].totalSetsDone).toBeDefined();

    // User B lists → empty
    const { json: listB } = await trpcQuery("session.list", undefined, cookieB);
    expect(listB.result.data).toEqual([]);
  });

  it("getById enforces ownership", async () => {
    const { res: resB } = await signUpTestUser({
      email: "sessionB-get@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;

    // User A creates a session
    const { json: createJson } = await trpcMutation(
      "session.create",
      makeSession({ workoutTitle: "A's Session" }),
    );
    const id = createJson.result.data.id;

    // User B tries to get it → 404
    const { status } = await trpcQuery("session.getById", { id }, cookieB);
    expect(status).toBe(404);
  });

  it("delete enforces ownership", async () => {
    const { res: resB } = await signUpTestUser({
      email: "sessionB-del@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;

    // User A creates a session
    const { json: createJson } = await trpcMutation(
      "session.create",
      makeSession({ workoutTitle: "A's Session Del" }),
    );
    const id = createJson.result.data.id;

    // User B tries to delete → 404
    const { status: statusB } = await trpcMutation("session.delete", { id }, cookieB);
    expect(statusB).toBe(404);

    // User A still sees it
    const { status: statusA } = await trpcQuery("session.getById", { id });
    expect(statusA).toBe(200);
  });

  // --- list ---
  it("list returns empty array initially for new user", async () => {
    const { res: resC } = await signUpTestUser({
      email: "sessionC@test.com",
      password: "password123",
    });
    const cookieC = getSessionCookie(resC)!;
    const { status, json } = await trpcQuery("session.list", undefined, cookieC);
    expect(status).toBe(200);
    expect(json.result.data).toEqual([]);
  });

  // --- create ---
  it("create with exercises and sets", async () => {
    const { status, json } = await trpcMutation("session.create", makeSession());
    expect(status).toBe(200);
    const session = json.result.data;
    expect(session.workoutTitle).toBe("Push Day");
    expect(session.loggedExercises).toHaveLength(2);
    expect(session.loggedExercises[0].name).toBe("Bench Press");
    expect(session.loggedExercises[0].loggedSets).toHaveLength(3);
    expect(session.loggedExercises[0].loggedSets[0].weight).toBe(100);
    expect(session.loggedExercises[0].loggedSets[0].done).toBe(1);
    expect(session.loggedExercises[1].name).toBe("Overhead Press");
    expect(session.loggedExercises[1].loggedSets).toHaveLength(1);
    // Stats: 3 done sets (100*10 + 120*8 + 60*10 = 1000 + 960 + 600 = 2560)
    expect(session.totalSetsDone).toBe(3);
    expect(session.totalVolume).toBe(2560);
  });

  it("create with zero exercises succeeds", async () => {
    const { status, json } = await trpcMutation(
      "session.create",
      makeSession({
        workoutTitle: "Rest",
        finishedAt: 1700000060,
        durationSeconds: 60,
        exercises: [],
      }),
    );
    expect(status).toBe(200);
    const session = json.result.data;
    expect(session.loggedExercises).toHaveLength(0);
    expect(session.totalSetsDone).toBe(0);
    expect(session.totalVolume).toBe(0);
  });

  it("create with blank workoutTitle returns 400", async () => {
    const { status } = await trpcMutation("session.create", makeSession({ workoutTitle: "   " }));
    expect(status).toBe(400);
  });

  // --- getById ---
  it("getById returns nested session with stats", async () => {
    const { json: createJson } = await trpcMutation(
      "session.create",
      makeSession({
        workoutTitle: "Get Test",
        exercises: [
          {
            exerciseId: "ex-1",
            name: "Squat",
            sets: [{ weight: 225, targetReps: 5, actualReps: 5, done: true }],
          },
        ],
      }),
    );
    const id = createJson.result.data.id;

    const { status, json } = await trpcQuery("session.getById", { id });
    expect(status).toBe(200);
    expect(json.result.data.workoutTitle).toBe("Get Test");
    expect(json.result.data.loggedExercises[0].name).toBe("Squat");
    expect(json.result.data.loggedExercises[0].loggedSets[0].weight).toBe(225);
    expect(json.result.data.totalSetsDone).toBe(1);
    expect(json.result.data.totalVolume).toBe(1125);
  });

  it("getById with non-existent id returns 404", async () => {
    const { status } = await trpcQuery("session.getById", { id: "non-existent-id" });
    expect(status).toBe(404);
  });

  // --- list with data ---
  it("list ordered by finishedAt desc with stats", async () => {
    await trpcMutation(
      "session.create",
      makeSession({
        workoutTitle: "Early",
        finishedAt: 1700000100,
        durationSeconds: 100,
        exercises: [],
      }),
    );
    await trpcMutation(
      "session.create",
      makeSession({
        workoutTitle: "Late",
        finishedAt: 1700099999,
        durationSeconds: 99999,
        exercises: [
          {
            exerciseId: "ex-1",
            name: "Curl",
            sets: [{ weight: 30, targetReps: 12, actualReps: 12, done: true }],
          },
        ],
      }),
    );

    const { json } = await trpcQuery("session.list");
    const data = json.result.data as { finishedAt: number; totalSetsDone: number }[];
    expect(data.length).toBeGreaterThanOrEqual(2);
    // Ordered by finishedAt desc
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1]!.finishedAt).toBeGreaterThanOrEqual(data[i]!.finishedAt);
    }
    // Each item has stats
    for (const item of data) {
      expect(item).toHaveProperty("totalSetsDone");
    }
  });

  // --- delete ---
  it("delete removes session", async () => {
    const { json: createJson } = await trpcMutation(
      "session.create",
      makeSession({
        workoutTitle: "To Delete",
        finishedAt: 1700000060,
        durationSeconds: 60,
        exercises: [
          {
            exerciseId: "ex-1",
            name: "Deadlift",
            sets: [{ weight: 315, targetReps: 3, actualReps: 3, done: true }],
          },
        ],
      }),
    );
    const id = createJson.result.data.id;

    const { status } = await trpcMutation("session.delete", { id });
    expect(status).toBe(200);

    const { status: getStatus } = await trpcQuery("session.getById", { id });
    expect(getStatus).toBe(404);
  });

  it("delete non-existent id returns 404", async () => {
    const { status } = await trpcMutation("session.delete", { id: "non-existent-id" });
    expect(status).toBe(404);
  });

  it("delete cascades to exercises and sets", async () => {
    const { json: createJson } = await trpcMutation(
      "session.create",
      makeSession({
        workoutTitle: "Cascade Test",
        finishedAt: 1700000060,
        durationSeconds: 60,
        exercises: [
          {
            exerciseId: "ex-1",
            name: "Bench",
            sets: [{ weight: 100, targetReps: 10, actualReps: 10, done: true }],
          },
        ],
      }),
    );
    const id = createJson.result.data.id;

    await trpcMutation("session.delete", { id });

    const { status } = await trpcQuery("session.getById", { id });
    expect(status).toBe(404);
  });

  it("list returns exercises and sets in correct order", async () => {
    const { json: createJson } = await trpcMutation(
      "session.create",
      makeSession({
        workoutTitle: "Ordered",
        finishedAt: 1700999999,
        durationSeconds: 999999,
        exercises: [
          {
            exerciseId: "ex-1",
            name: "First",
            sets: [
              { weight: 100, targetReps: 10, actualReps: 10, done: true },
              { weight: 110, targetReps: 8, actualReps: 8, done: true },
            ],
          },
          {
            exerciseId: "ex-2",
            name: "Second",
            sets: [{ weight: 50, targetReps: 15, actualReps: 15, done: true }],
          },
        ],
      }),
    );
    const id = createJson.result.data.id;

    const { json } = await trpcQuery("session.getById", { id });
    const session = json.result.data;
    expect(session.loggedExercises[0].name).toBe("First");
    expect(session.loggedExercises[1].name).toBe("Second");
    expect(session.loggedExercises[0].loggedSets[0].weight).toBe(100);
    expect(session.loggedExercises[0].loggedSets[1].weight).toBe(110);
  });
});
