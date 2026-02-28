import type {
  Exercise,
  LoggedExercise,
  LoggedSet,
  Session,
  SetTemplate,
  Workout,
} from "../workout";

describe("workout types", () => {
  it("can instantiate all exported types", () => {
    const set: SetTemplate = { id: 1, exerciseId: 1, weight: 100, targetReps: 8, order: 0 };
    const exercise: Exercise = { id: 1, workoutId: 1, name: "Bench", order: 0, sets: [set] };
    const workout: Workout = { id: 1, title: "Push", createdAt: Date.now(), exercises: [exercise] };

    const loggedSet: LoggedSet = {
      id: 1,
      loggedExerciseId: 1,
      weight: 100,
      targetReps: 8,
      actualReps: 8,
      done: true,
      order: 0,
    };
    const loggedExercise: LoggedExercise = {
      id: 1,
      sessionId: 1,
      exerciseId: 1,
      name: "Bench",
      order: 0,
      sets: [loggedSet],
    };
    const session: Session = {
      id: 1,
      workoutId: 1,
      workoutTitle: "Push",
      startedAt: Date.now(),
      finishedAt: Date.now(),
      durationSeconds: 3600,
      exercises: [loggedExercise],
    };

    expect(workout).toBeDefined();
    expect(session).toBeDefined();
  });
});
