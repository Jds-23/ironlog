import type { LoggedExercise, Session } from "@/contexts/workout-context";

import {
  calcCompletedSets,
  calcTotalVolume,
  formatDuration,
  formatSessionDate,
  getSessionExerciseNames,
} from "../session";

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(2730)).toBe("45m 30s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(4500)).toBe("1h 15m");
  });

  it("formats exact hour", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
  });

  it("returns 0s for zero", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});

describe("formatSessionDate", () => {
  it("formats epoch ms to readable date", () => {
    // 27 Feb 2026 14:32 UTC
    const ts = Date.UTC(2026, 1, 27, 14, 32, 0);
    const result = formatSessionDate(ts);
    // Should contain date parts (timezone-dependent, check structure)
    expect(result).toMatch(/27 Feb 2026/);
    expect(result).toContain("·");
  });

  it("pads single-digit hours and minutes", () => {
    // 5 Jan 2026 09:05 UTC
    const ts = Date.UTC(2026, 0, 5, 9, 5, 0);
    const result = formatSessionDate(ts);
    expect(result).toMatch(/5 Jan 2026/);
  });
});

describe("calcTotalVolume", () => {
  it("returns 0 for empty exercises", () => {
    expect(calcTotalVolume([])).toBe(0);
  });

  it("sums weight × actualReps for sets with both values", () => {
    const exercises: LoggedExercise[] = [
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
            weight: 100,
            targetReps: 8,
            actualReps: 8,
            done: true,
            order: 0,
          },
          {
            id: 2,
            loggedExerciseId: 1,
            weight: 100,
            targetReps: 8,
            actualReps: 6,
            done: true,
            order: 1,
          },
        ],
      },
    ];
    expect(calcTotalVolume(exercises)).toBe(1400); // 800 + 600
  });

  it("skips sets missing weight or actualReps", () => {
    const exercises: LoggedExercise[] = [
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
            weight: 100,
            targetReps: 8,
            actualReps: null,
            done: false,
            order: 0,
          },
          {
            id: 2,
            loggedExerciseId: 1,
            weight: null,
            targetReps: 8,
            actualReps: 8,
            done: true,
            order: 1,
          },
          {
            id: 3,
            loggedExerciseId: 1,
            weight: 50,
            targetReps: 8,
            actualReps: 10,
            done: true,
            order: 2,
          },
        ],
      },
    ];
    expect(calcTotalVolume(exercises)).toBe(500);
  });
});

describe("calcCompletedSets", () => {
  it("returns 0 for empty exercises", () => {
    expect(calcCompletedSets([])).toBe(0);
  });

  it("counts only done sets", () => {
    const exercises: LoggedExercise[] = [
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
            weight: 100,
            targetReps: 8,
            actualReps: 8,
            done: true,
            order: 0,
          },
          {
            id: 2,
            loggedExerciseId: 1,
            weight: 100,
            targetReps: 8,
            actualReps: null,
            done: false,
            order: 1,
          },
        ],
      },
      {
        id: 2,
        sessionId: 1,
        exerciseId: 2,
        name: "OHP",
        order: 1,
        sets: [
          {
            id: 3,
            loggedExerciseId: 2,
            weight: 60,
            targetReps: 10,
            actualReps: 10,
            done: true,
            order: 0,
          },
        ],
      },
    ];
    expect(calcCompletedSets(exercises)).toBe(2);
  });
});

describe("getSessionExerciseNames", () => {
  const sessions: Session[] = [
    {
      id: 1,
      workoutId: 1,
      workoutTitle: "Push",
      startedAt: 1000,
      finishedAt: 2000,
      durationSeconds: 1,
      exercises: [
        { id: 1, sessionId: 1, exerciseId: 1, name: "Bench Press", order: 0, sets: [] },
        { id: 2, sessionId: 1, exerciseId: 2, name: "OHP", order: 1, sets: [] },
      ],
    },
    {
      id: 2,
      workoutId: 1,
      workoutTitle: "Push",
      startedAt: 3000,
      finishedAt: 4000,
      durationSeconds: 1,
      exercises: [
        { id: 3, sessionId: 2, exerciseId: 1, name: "Bench Press", order: 0, sets: [] },
        { id: 4, sessionId: 2, exerciseId: 3, name: "Dips", order: 1, sets: [] },
      ],
    },
  ];

  it("returns unique exercise names sorted alphabetically", () => {
    expect(getSessionExerciseNames(sessions)).toEqual(["Bench Press", "Dips", "OHP"]);
  });

  it("returns empty array for no sessions", () => {
    expect(getSessionExerciseNames([])).toEqual([]);
  });
});
