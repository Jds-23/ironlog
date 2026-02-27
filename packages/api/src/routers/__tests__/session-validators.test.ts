import { describe, expect, it } from "vitest";

import {
  computeSessionStats,
  createSessionInput,
  loggedExerciseInput,
  loggedSetInput,
} from "../session";

describe("loggedSetInput", () => {
  it("accepts valid set with done:true", () => {
    const result = loggedSetInput.safeParse({
      weight: 100,
      targetReps: 10,
      actualReps: 8,
      done: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing done", () => {
    const result = loggedSetInput.safeParse({
      weight: 100,
      targetReps: 10,
      actualReps: 8,
    });
    expect(result.success).toBe(false);
  });

  it("accepts omitted weight, targetReps, actualReps", () => {
    const result = loggedSetInput.safeParse({ done: false });
    expect(result.success).toBe(true);
  });
});

describe("loggedExerciseInput", () => {
  it("accepts valid exercise", () => {
    const result = loggedExerciseInput.safeParse({
      exerciseId: 1,
      name: "Bench Press",
      sets: [{ weight: 135, targetReps: 8, actualReps: 8, done: true }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = loggedExerciseInput.safeParse({
      exerciseId: 1,
      name: "",
      sets: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("createSessionInput", () => {
  it("accepts full valid payload", () => {
    const result = createSessionInput.safeParse({
      workoutId: 1,
      workoutTitle: "Push Day",
      startedAt: 1700000000,
      finishedAt: 1700003600,
      durationSeconds: 3600,
      exercises: [
        {
          exerciseId: 1,
          name: "Bench Press",
          sets: [{ weight: 135, targetReps: 8, actualReps: 8, done: true }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects blank workoutTitle", () => {
    const result = createSessionInput.safeParse({
      workoutId: 1,
      workoutTitle: "   ",
      startedAt: 1700000000,
      finishedAt: 1700003600,
      durationSeconds: 3600,
      exercises: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("computeSessionStats", () => {
  it("returns zeros for empty exercises", () => {
    expect(computeSessionStats([])).toEqual({ totalSetsDone: 0, totalVolume: 0 });
  });

  it("counts only done sets", () => {
    const result = computeSessionStats([
      {
        loggedSets: [
          { done: 1, weight: 100, actualReps: 10 },
          { done: 1, weight: 100, actualReps: 10 },
          { done: 0, weight: 100, actualReps: 10 },
        ],
      },
    ]);
    expect(result.totalSetsDone).toBe(2);
  });

  it("computes totalVolume as sum of weight*actualReps for done sets", () => {
    const result = computeSessionStats([
      {
        loggedSets: [
          { done: 1, weight: 100, actualReps: 10 },
          { done: 1, weight: 50, actualReps: 8 },
          { done: 1, weight: null, actualReps: 5 },
        ],
      },
    ]);
    expect(result.totalVolume).toBe(1400);
  });

  it("done set with null actualReps contributes 0 volume", () => {
    const result = computeSessionStats([
      {
        loggedSets: [{ done: 1, weight: 100, actualReps: null }],
      },
    ]);
    expect(result.totalSetsDone).toBe(1);
    expect(result.totalVolume).toBe(0);
  });
});
