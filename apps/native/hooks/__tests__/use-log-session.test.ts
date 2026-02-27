import { renderHook, act } from "@testing-library/react-native";

import type { Workout } from "@/contexts/workout-context";

import { useLogSession } from "../use-log-session";

const workout: Workout = {
  id: 1,
  title: "Push Day",
  createdAt: 1000,
  exercises: [
    {
      id: 10,
      workoutId: 1,
      name: "Bench Press",
      order: 0,
      sets: [
        { id: 100, exerciseId: 10, weight: 135, targetReps: 8, order: 0 },
        { id: 101, exerciseId: 10, weight: 135, targetReps: 8, order: 1 },
      ],
    },
    {
      id: 11,
      workoutId: 1,
      name: "OHP",
      order: 1,
      sets: [{ id: 200, exerciseId: 11, weight: 95, targetReps: 10, order: 0 }],
    },
  ],
};

describe("useLogSession", () => {
  it("clones exercises from workout template", () => {
    const { result } = renderHook(() => useLogSession(workout));
    expect(result.current.logExercises).toHaveLength(2);
    expect(result.current.logExercises[0].name).toBe("Bench Press");
    expect(result.current.logExercises[0].sets).toHaveLength(2);
    expect(result.current.logExercises[0].sets[0].weight).toBe(135);
    expect(result.current.logExercises[0].sets[0].targetReps).toBe(8);
    expect(result.current.logExercises[0].sets[0].actualReps).toBe(8);
    expect(result.current.logExercises[0].sets[0].done).toBe(false);
  });

  it("does not mutate original workout", () => {
    const { result } = renderHook(() => useLogSession(workout));
    act(() => {
      result.current.updateWeight(0, 0, 200);
    });
    expect(workout.exercises[0].sets[0].weight).toBe(135);
  });

  it("updateWeight changes set weight", () => {
    const { result } = renderHook(() => useLogSession(workout));
    act(() => {
      result.current.updateWeight(0, 0, 185);
    });
    expect(result.current.logExercises[0].sets[0].weight).toBe(185);
  });

  it("updateReps changes set actualReps", () => {
    const { result } = renderHook(() => useLogSession(workout));
    act(() => {
      result.current.updateReps(0, 0, 12);
    });
    expect(result.current.logExercises[0].sets[0].actualReps).toBe(12);
  });

  it("toggleDone marks set as done and returns new state", () => {
    const { result } = renderHook(() => useLogSession(workout));
    let done: boolean;
    act(() => {
      done = result.current.toggleDone(0, 0);
    });
    expect(done!).toBe(true);
    expect(result.current.logExercises[0].sets[0].done).toBe(true);
  });

  it("toggleDone toggles back to undone", () => {
    const { result } = renderHook(() => useLogSession(workout));
    act(() => {
      result.current.toggleDone(0, 0);
    });
    let done: boolean;
    act(() => {
      done = result.current.toggleDone(0, 0);
    });
    expect(done!).toBe(false);
    expect(result.current.logExercises[0].sets[0].done).toBe(false);
  });

  it("nextUndoneSet points to first undone set", () => {
    const { result } = renderHook(() => useLogSession(workout));
    expect(result.current.nextUndoneSet).toEqual({
      exIdx: 0,
      setIdx: 0,
      exerciseName: "Bench Press",
      setNumber: 1,
      weight: 135,
    });
  });

  it("nextUndoneSet advances after toggling done", () => {
    const { result } = renderHook(() => useLogSession(workout));
    act(() => {
      result.current.toggleDone(0, 0);
    });
    expect(result.current.nextUndoneSet?.exIdx).toBe(0);
    expect(result.current.nextUndoneSet?.setIdx).toBe(1);
  });

  it("nextUndoneSet is null when all done", () => {
    const { result } = renderHook(() => useLogSession(workout));
    act(() => {
      result.current.toggleDone(0, 0);
      result.current.toggleDone(0, 1);
      result.current.toggleDone(1, 0);
    });
    expect(result.current.nextUndoneSet).toBeNull();
  });

  it("progress tracks done/total", () => {
    const { result } = renderHook(() => useLogSession(workout));
    expect(result.current.progress).toEqual({ done: 0, total: 3 });
    act(() => {
      result.current.toggleDone(0, 0);
    });
    expect(result.current.progress).toEqual({ done: 1, total: 3 });
  });

  it("allDone is true when all sets done", () => {
    const { result } = renderHook(() => useLogSession(workout));
    expect(result.current.allDone).toBe(false);
    act(() => {
      result.current.toggleDone(0, 0);
      result.current.toggleDone(0, 1);
      result.current.toggleDone(1, 0);
    });
    expect(result.current.allDone).toBe(true);
  });

  it("buildSession creates a valid Session object", () => {
    const { result } = renderHook(() => useLogSession(workout));
    act(() => {
      result.current.updateWeight(0, 0, 140);
      result.current.updateReps(0, 0, 6);
      result.current.toggleDone(0, 0);
    });
    const startedAt = 5000;
    let session: ReturnType<typeof result.current.buildSession>;
    act(() => {
      session = result.current.buildSession(startedAt);
    });
    expect(session!.workoutId).toBe(1);
    expect(session!.workoutTitle).toBe("Push Day");
    expect(session!.startedAt).toBe(5000);
    expect(session!.finishedAt).toBeGreaterThan(0);
    expect(session!.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(session!.exercises).toHaveLength(2);
    expect(session!.exercises[0].sets[0].weight).toBe(140);
    expect(session!.exercises[0].sets[0].actualReps).toBe(6);
    expect(session!.exercises[0].sets[0].done).toBe(true);
  });

  it("handles null weight and reps in template", () => {
    const nullWorkout: Workout = {
      id: 2,
      title: "Test",
      createdAt: 1000,
      exercises: [
        {
          id: 10,
          workoutId: 2,
          name: "Exercise",
          order: 0,
          sets: [{ id: 100, exerciseId: 10, weight: null, targetReps: null, order: 0 }],
        },
      ],
    };
    const { result } = renderHook(() => useLogSession(nullWorkout));
    expect(result.current.logExercises[0].sets[0].weight).toBeNull();
    expect(result.current.logExercises[0].sets[0].actualReps).toBeNull();
  });
});
