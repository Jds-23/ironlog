import { render, screen, renderHook, act } from "@testing-library/react-native";
import { Text } from "react-native";

import { WorkoutProvider, useWorkout, isWorkoutActive } from "../workout-context";
import type { WorkoutState } from "../workout-context";

describe("WorkoutContext", () => {
  describe("scaffold", () => {
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

  describe("SET/CLEAR_ACTIVE_WORKOUT", () => {
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

  describe("initialState shape", () => {
    it("initial state does not contain workouts array", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkoutProvider>{children}</WorkoutProvider>
      );
      const { result } = renderHook(() => useWorkout(), { wrapper });
      expect(result.current.state).not.toHaveProperty("workouts");
    });

    it("initial state does not contain sessions array", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkoutProvider>{children}</WorkoutProvider>
      );
      const { result } = renderHook(() => useWorkout(), { wrapper });
      expect(result.current.state).not.toHaveProperty("sessions");
    });
  });

  describe("Selectors", () => {
    const baseState: WorkoutState = {
      activeWorkoutId: 1,
    };

    it("isWorkoutActive checks activeWorkoutId", () => {
      expect(isWorkoutActive(baseState, 1)).toBe(true);
      expect(isWorkoutActive(baseState, 2)).toBe(false);
    });
  });
});
