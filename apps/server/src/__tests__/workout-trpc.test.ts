import { describe, it, expect, beforeAll } from "vitest";
import app from "../index";
import { createWorkoutTables } from "./helpers/setup-db";

beforeAll(async () => {
  await createWorkoutTables();
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

describe("workout tRPC", () => {
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
    const data = json.result.data as { id: number; title: string }[];
    expect(data.length).toBeGreaterThanOrEqual(3);
    // IDs should be in descending order (most recent first)
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1]!.id).toBeGreaterThan(data[i]!.id);
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
    const { status } = await trpcQuery("workout.getById", { id: 99999 });
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
    const { status } = await trpcMutation("workout.delete", { id: 99999 });
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
      id: 99999,
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
