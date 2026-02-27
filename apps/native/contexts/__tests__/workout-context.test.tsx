import { render, screen, renderHook, act } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  WorkoutProvider,
  useWorkout,
  getWorkoutById,
  getSessionById,
  getAllSessions,
  getUniqueExercises,
  isWorkoutActive,
} from "../workout-context";
import type { Exercise, Session, WorkoutState } from "../workout-context";

describe("WorkoutContext", () => {
  describe("Phase 1: scaffold", () => {
    it("renders children without crashing", () => {
      render(
        <WorkoutProvider>
          <Text>child</Text>
        </WorkoutProvider>,
      );
      expect(screen.getByText("child")).toBeTruthy();
    });

    it("useWorkout throws outside provider", () => {
      expect(() => renderHook(() => useWorkout())).toThrow(
        "useWorkout must be used within WorkoutProvider",
      );
    });
  });

  describe("Phase 2: ADD_WORKOUT", () => {
    it("adds a workout with auto-incremented id and createdAt", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkoutProvider>{children}</WorkoutProvider>
      );
      const { result } = renderHook(() => useWorkout(), { wrapper });

      const exercises: Exercise[] = [{ id: 1, workoutId: 0, name: "Squat", order: 0, sets: [] }];

      act(() => {
        result.current.dispatch({
          type: "ADD_WORKOUT",
          payload: { title: "Leg Day", exercises },
        });
      });

      const workout = result.current.state.workouts[0];
      expect(workout).toBeDefined();
      expect(workout.title).toBe("Leg Day");
      expect(workout.id).toBeGreaterThan(0);
      expect(workout.createdAt).toBeGreaterThan(0);
      expect(workout.exercises).toEqual(exercises);
    });
  });

  describe("Phase 3: UPDATE_WORKOUT", () => {
    it("updates a workout by id", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkoutProvider>{children}</WorkoutProvider>
      );
      const { result } = renderHook(() => useWorkout(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "ADD_WORKOUT",
          payload: { title: "Leg Day", exercises: [] },
        });
      });

      const id = result.current.state.workouts[0].id;

      act(() => {
        result.current.dispatch({
          type: "UPDATE_WORKOUT",
          payload: { id, title: "Push Day", exercises: [] },
        });
      });

      expect(result.current.state.workouts[0].title).toBe("Push Day");
      expect(result.current.state.workouts).toHaveLength(1);
    });
  });

  describe("Phase 4: DELETE_WORKOUT", () => {
    it("removes a workout by id", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkoutProvider>{children}</WorkoutProvider>
      );
      const { result } = renderHook(() => useWorkout(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "ADD_WORKOUT",
          payload: { title: "Leg Day", exercises: [] },
        });
      });

      const id = result.current.state.workouts[0].id;

      act(() => {
        result.current.dispatch({ type: "DELETE_WORKOUT", payload: { id } });
      });

      expect(result.current.state.workouts).toHaveLength(0);
    });

    it("does not delete an active workout", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkoutProvider>{children}</WorkoutProvider>
      );
      const { result } = renderHook(() => useWorkout(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "ADD_WORKOUT",
          payload: { title: "Leg Day", exercises: [] },
        });
      });

      const id = result.current.state.workouts[0].id;

      act(() => {
        result.current.dispatch({ type: "SET_ACTIVE_WORKOUT", payload: { id } });
      });

      act(() => {
        result.current.dispatch({ type: "DELETE_WORKOUT", payload: { id } });
      });

      expect(result.current.state.workouts).toHaveLength(1);
    });
  });

  describe("Phase 5: ADD_SESSION", () => {
    it("adds a session to state", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkoutProvider>{children}</WorkoutProvider>
      );
      const { result } = renderHook(() => useWorkout(), { wrapper });

      const session: Session = {
        id: Date.now(),
        workoutId: 1,
        workoutTitle: "Leg Day",
        startedAt: Date.now() - 3600_000,
        finishedAt: Date.now(),
        durationSeconds: 3600,
        exercises: [],
      };

      act(() => {
        result.current.dispatch({ type: "ADD_SESSION", payload: session });
      });

      expect(result.current.state.sessions).toHaveLength(1);
      expect(result.current.state.sessions[0].workoutTitle).toBe("Leg Day");
    });
  });

  describe("Phase 6: SET/CLEAR_ACTIVE_WORKOUT", () => {
    it("sets and clears activeWorkoutId", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkoutProvider>{children}</WorkoutProvider>
      );
      const { result } = renderHook(() => useWorkout(), { wrapper });

      expect(result.current.state.activeWorkoutId).toBeNull();

      act(() => {
        result.current.dispatch({ type: "SET_ACTIVE_WORKOUT", payload: { id: 42 } });
      });

      expect(result.current.state.activeWorkoutId).toBe(42);

      act(() => {
        result.current.dispatch({ type: "CLEAR_ACTIVE_WORKOUT" });
      });

      expect(result.current.state.activeWorkoutId).toBeNull();
    });
  });

  describe("Phase 7: Selectors", () => {
    const baseState: WorkoutState = {
      workouts: [
        {
          id: 1,
          title: "Leg Day",
          createdAt: 1000,
          exercises: [
            { id: 10, workoutId: 1, name: "Squat", order: 0, sets: [] },
            { id: 11, workoutId: 1, name: "Lunge", order: 1, sets: [] },
          ],
        },
        {
          id: 2,
          title: "Push Day",
          createdAt: 2000,
          exercises: [
            { id: 20, workoutId: 2, name: "Bench Press", order: 0, sets: [] },
            { id: 21, workoutId: 2, name: "Squat", order: 1, sets: [] },
          ],
        },
      ],
      sessions: [
        {
          id: 100,
          workoutId: 1,
          workoutTitle: "Leg Day",
          startedAt: 5000,
          finishedAt: 6000,
          durationSeconds: 1000,
          exercises: [],
        },
        {
          id: 101,
          workoutId: 2,
          workoutTitle: "Push Day",
          startedAt: 8000,
          finishedAt: 9000,
          durationSeconds: 1000,
          exercises: [],
        },
        {
          id: 102,
          workoutId: 1,
          workoutTitle: "Leg Day",
          startedAt: 3000,
          finishedAt: 4000,
          durationSeconds: 1000,
          exercises: [],
        },
      ],
      activeWorkoutId: 1,
    };

    it("getWorkoutById returns correct workout or undefined", () => {
      expect(getWorkoutById(baseState, 1)?.title).toBe("Leg Day");
      expect(getWorkoutById(baseState, 999)).toBeUndefined();
    });

    it("getSessionById returns correct session or undefined", () => {
      expect(getSessionById(baseState, 100)?.workoutTitle).toBe("Leg Day");
      expect(getSessionById(baseState, 999)).toBeUndefined();
    });

    it("getAllSessions returns sessions sorted newest-first", () => {
      const sorted = getAllSessions(baseState);
      expect(sorted.map((s) => s.id)).toEqual([101, 100, 102]);
    });

    it("getUniqueExercises returns deduplicated exercise names", () => {
      const names = getUniqueExercises(baseState);
      expect(names).toEqual(["Bench Press", "Lunge", "Squat"]);
    });

    it("isWorkoutActive checks activeWorkoutId", () => {
      expect(isWorkoutActive(baseState, 1)).toBe(true);
      expect(isWorkoutActive(baseState, 2)).toBe(false);
    });
  });
});
