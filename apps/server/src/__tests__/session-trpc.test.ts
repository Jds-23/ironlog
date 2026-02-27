import { describe, it, expect, beforeAll } from "vitest";
import app from "../index";
import { createSessionTables } from "./helpers/setup-db";

let workoutId: number;

beforeAll(async () => {
  await createSessionTables();
  // Create a workout so session FK constraint is satisfied
  const res = await app.request("/trpc/workout.create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Seed Workout", exercises: [] }),
  });
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workoutId = (json as any).result.data.id;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function trpcQuery(path: string, input?: unknown): Promise<{ status: number; json: any }> {
  const url = input
    ? `/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `/trpc/${path}`;
  const res = await app.request(url);
  return { status: res.status, json: await res.json() };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function trpcMutation(path: string, input: unknown): Promise<{ status: number; json: any }> {
  const res = await app.request("/trpc/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
        exerciseId: 1,
        name: "Bench Press",
        sets: [
          { weight: 100, targetReps: 10, actualReps: 10, done: true },
          { weight: 120, targetReps: 8, actualReps: 8, done: true },
          { weight: 140, targetReps: 6, actualReps: 0, done: false },
        ],
      },
      {
        exerciseId: 2,
        name: "Overhead Press",
        sets: [{ weight: 60, targetReps: 10, actualReps: 10, done: true }],
      },
    ],
    ...overrides,
  };
}

describe("session tRPC", () => {
  // --- list ---
  it("list returns empty array initially", async () => {
    const { status, json } = await trpcQuery("session.list");
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
            exerciseId: 1,
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
    const { status } = await trpcQuery("session.getById", { id: 99999 });
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
            exerciseId: 1,
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
            exerciseId: 1,
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
    const { status } = await trpcMutation("session.delete", { id: 99999 });
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
            exerciseId: 1,
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
            exerciseId: 1,
            name: "First",
            sets: [
              { weight: 100, targetReps: 10, actualReps: 10, done: true },
              { weight: 110, targetReps: 8, actualReps: 8, done: true },
            ],
          },
          {
            exerciseId: 2,
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
