import { mapServerSession, mapServerListSession } from "../session-mappers";

describe("mapServerSession", () => {
  it("maps loggedExercises→exercises and done 0|1→boolean", () => {
    const serverSession = {
      id: 1,
      workoutId: 1,
      workoutTitle: "Push Day",
      startedAt: 1000,
      finishedAt: 2000,
      durationSeconds: 1000,
      loggedExercises: [
        {
          id: 10,
          sessionId: 1,
          exerciseId: 5,
          name: "Bench Press",
          order: 0,
          loggedSets: [
            {
              id: 100,
              loggedExerciseId: 10,
              weight: 135,
              targetReps: 8,
              actualReps: 8,
              done: 1,
              order: 0,
            },
            {
              id: 101,
              loggedExerciseId: 10,
              weight: 135,
              targetReps: 8,
              actualReps: 6,
              done: 0,
              order: 1,
            },
          ],
        },
      ],
    };

    const result = mapServerSession(serverSession);

    expect(result.id).toBe(1);
    expect(result.workoutTitle).toBe("Push Day");
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].name).toBe("Bench Press");
    expect(result.exercises[0].sets).toHaveLength(2);
    expect(result.exercises[0].sets[0].done).toBe(true);
    expect(result.exercises[0].sets[1].done).toBe(false);
    expect(result.exercises[0].sets[0].weight).toBe(135);
    expect(result.exercises[0].sets[0].actualReps).toBe(8);
  });

  it("handles empty exercises and null values", () => {
    const result = mapServerSession({
      id: 2,
      workoutId: 1,
      workoutTitle: "Empty",
      startedAt: 1000,
      finishedAt: 2000,
      durationSeconds: 1000,
      loggedExercises: [],
    });
    expect(result.exercises).toEqual([]);
  });

  it("preserves null weight and reps", () => {
    const result = mapServerSession({
      id: 3,
      workoutId: 1,
      workoutTitle: "Nulls",
      startedAt: 1000,
      finishedAt: 2000,
      durationSeconds: 1000,
      loggedExercises: [
        {
          id: 10,
          sessionId: 3,
          exerciseId: 5,
          name: "Bodyweight",
          order: 0,
          loggedSets: [
            {
              id: 100,
              loggedExerciseId: 10,
              weight: null,
              targetReps: null,
              actualReps: null,
              done: 0,
              order: 0,
            },
          ],
        },
      ],
    });
    expect(result.exercises[0].sets[0].weight).toBeNull();
    expect(result.exercises[0].sets[0].targetReps).toBeNull();
    expect(result.exercises[0].sets[0].actualReps).toBeNull();
    expect(result.exercises[0].sets[0].done).toBe(false);
  });
});

describe("mapServerListSession", () => {
  it("includes totalSetsDone and totalVolume alongside mapped session", () => {
    const result = mapServerListSession({
      id: 1,
      workoutId: 1,
      workoutTitle: "Push Day",
      startedAt: 1000,
      finishedAt: 2000,
      durationSeconds: 1000,
      totalSetsDone: 5,
      totalVolume: 3000,
      loggedExercises: [
        {
          id: 10,
          sessionId: 1,
          exerciseId: 5,
          name: "Bench Press",
          order: 0,
          loggedSets: [
            {
              id: 100,
              loggedExerciseId: 10,
              weight: 100,
              targetReps: 8,
              actualReps: 8,
              done: 1,
              order: 0,
            },
          ],
        },
      ],
    });

    expect(result.totalSetsDone).toBe(5);
    expect(result.totalVolume).toBe(3000);
    expect(result.exercises[0].sets[0].done).toBe(true);
    expect(result.workoutTitle).toBe("Push Day");
  });
});
