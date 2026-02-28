import type { Session } from "@/types/workout";

import { getExerciseStats, getMaxWeightOverTime, getVolumeOverTime } from "../progress";

const sessions: Session[] = [
  {
    id: 1,
    workoutId: 1,
    workoutTitle: "Push",
    startedAt: Date.UTC(2026, 1, 25, 10, 0, 0),
    finishedAt: Date.UTC(2026, 1, 25, 11, 0, 0),
    durationSeconds: 3600,
    exercises: [
      {
        id: 1,
        sessionId: 1,
        exerciseId: 1,
        name: "Bench Press",
        order: 0,
        sets: [
          {
            id: 1,
            loggedExerciseId: 1,
            weight: 80,
            targetReps: 8,
            actualReps: 8,
            done: true,
            order: 0,
          },
          {
            id: 2,
            loggedExerciseId: 1,
            weight: 90,
            targetReps: 6,
            actualReps: 6,
            done: true,
            order: 1,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    workoutId: 1,
    workoutTitle: "Push",
    startedAt: Date.UTC(2026, 1, 27, 10, 0, 0),
    finishedAt: Date.UTC(2026, 1, 27, 11, 0, 0),
    durationSeconds: 3600,
    exercises: [
      {
        id: 3,
        sessionId: 2,
        exerciseId: 1,
        name: "Bench Press",
        order: 0,
        sets: [
          {
            id: 5,
            loggedExerciseId: 3,
            weight: 85,
            targetReps: 8,
            actualReps: 8,
            done: true,
            order: 0,
          },
          {
            id: 6,
            loggedExerciseId: 3,
            weight: 100,
            targetReps: 6,
            actualReps: 5,
            done: true,
            order: 1,
          },
        ],
      },
      {
        id: 4,
        sessionId: 2,
        exerciseId: 2,
        name: "OHP",
        order: 1,
        sets: [
          {
            id: 7,
            loggedExerciseId: 4,
            weight: 50,
            targetReps: 10,
            actualReps: 10,
            done: true,
            order: 0,
          },
        ],
      },
    ],
  },
];

describe("getVolumeOverTime", () => {
  it("returns per-session volume for a specific exercise", () => {
    const result = getVolumeOverTime(sessions, "Bench Press");
    expect(result).toEqual([
      { date: "25 Feb", volume: 1180 }, // 80*8 + 90*6
      { date: "27 Feb", volume: 1180 }, // 85*8 + 100*5
    ]);
  });

  it("returns empty for unknown exercise", () => {
    expect(getVolumeOverTime(sessions, "Deadlift")).toEqual([]);
  });

  it("skips sessions without the exercise", () => {
    const result = getVolumeOverTime(sessions, "OHP");
    expect(result).toEqual([{ date: "27 Feb", volume: 500 }]);
  });
});

describe("getMaxWeightOverTime", () => {
  it("returns per-session max weight for a specific exercise", () => {
    const result = getMaxWeightOverTime(sessions, "Bench Press");
    expect(result).toEqual([
      { date: "25 Feb", weight: 90 },
      { date: "27 Feb", weight: 100 },
    ]);
  });

  it("returns empty for unknown exercise", () => {
    expect(getMaxWeightOverTime(sessions, "Deadlift")).toEqual([]);
  });
});

describe("getExerciseStats", () => {
  it("returns personalBest, lastSessionVolume, and sessionsLogged", () => {
    const stats = getExerciseStats(sessions, "Bench Press");
    expect(stats).toEqual({
      personalBest: 100,
      lastSessionVolume: 1180,
      sessionsLogged: 2,
    });
  });

  it("returns zeroes for unknown exercise", () => {
    expect(getExerciseStats(sessions, "Deadlift")).toEqual({
      personalBest: 0,
      lastSessionVolume: 0,
      sessionsLogged: 0,
    });
  });
});
