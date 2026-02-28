import { mapServerWorkout, mapClientExercisesToInput } from "../workout-mappers";

describe("mapServerWorkout", () => {
  it("maps setTemplates→sets and createdAt Date→number", () => {
    const serverWorkout = {
      id: 1,
      title: "Push Day",
      createdAt: new Date("2025-01-15T10:00:00Z"),
      exercises: [
        {
          id: 10,
          workoutId: 1,
          name: "Bench Press",
          order: 0,
          setTemplates: [
            { id: 100, exerciseId: 10, weight: 135, targetReps: 8, order: 0 },
            { id: 101, exerciseId: 10, weight: 140, targetReps: 6, order: 1 },
          ],
        },
        {
          id: 11,
          workoutId: 1,
          name: "OHP",
          order: 1,
          setTemplates: [{ id: 200, exerciseId: 11, weight: 95, targetReps: 10, order: 0 }],
        },
      ],
    };

    const result = mapServerWorkout(serverWorkout);

    expect(result.id).toBe(1);
    expect(result.title).toBe("Push Day");
    expect(result.createdAt).toBe(new Date("2025-01-15T10:00:00Z").getTime());
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].name).toBe("Bench Press");
    expect(result.exercises[0].sets).toHaveLength(2);
    expect(result.exercises[0].sets[0]).toEqual({
      id: 100,
      exerciseId: 10,
      weight: 135,
      targetReps: 8,
      order: 0,
    });
    expect(result.exercises[1].sets).toHaveLength(1);
  });

  it("handles empty exercises array", () => {
    const result = mapServerWorkout({
      id: 2,
      title: "Empty",
      createdAt: new Date("2025-01-01"),
      exercises: [],
    });
    expect(result.exercises).toEqual([]);
  });

  it("handles exercises with empty setTemplates", () => {
    const result = mapServerWorkout({
      id: 3,
      title: "No Sets",
      createdAt: new Date("2025-01-01"),
      exercises: [{ id: 10, workoutId: 3, name: "Squat", order: 0, setTemplates: [] }],
    });
    expect(result.exercises[0].sets).toEqual([]);
  });

  it("preserves null weight and targetReps", () => {
    const result = mapServerWorkout({
      id: 4,
      title: "Nulls",
      createdAt: new Date("2025-01-01"),
      exercises: [
        {
          id: 10,
          workoutId: 4,
          name: "Bodyweight",
          order: 0,
          setTemplates: [{ id: 100, exerciseId: 10, weight: null, targetReps: null, order: 0 }],
        },
      ],
    });
    expect(result.exercises[0].sets[0].weight).toBeNull();
    expect(result.exercises[0].sets[0].targetReps).toBeNull();
  });
});

describe("mapClientExercisesToInput", () => {
  it("strips IDs and maps sets correctly for tRPC input", () => {
    const exercises = [
      {
        id: 10,
        workoutId: 1,
        name: "Bench Press",
        order: 0,
        sets: [
          { id: 100, exerciseId: 10, weight: 135, targetReps: 8, order: 0 },
          { id: 101, exerciseId: 10, weight: null, targetReps: null, order: 1 },
        ],
      },
    ];

    const result = mapClientExercisesToInput(exercises);

    expect(result).toEqual([
      {
        name: "Bench Press",
        sets: [
          { weight: 135, targetReps: 8 },
          { weight: null, targetReps: null },
        ],
      },
    ]);
    // Ensure no IDs leak through
    expect(result[0]).not.toHaveProperty("id");
    expect(result[0].sets[0]).not.toHaveProperty("id");
    expect(result[0].sets[0]).not.toHaveProperty("exerciseId");
    expect(result[0].sets[0]).not.toHaveProperty("order");
  });
});
