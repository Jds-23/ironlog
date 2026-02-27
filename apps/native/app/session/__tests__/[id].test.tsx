import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { WorkoutProvider, useWorkout } from "@/contexts/workout-context";
import type { Session } from "@/contexts/workout-context";

// Mock expo-router
const mockRouter = { back: jest.fn() };
let mockParams: { id: string } = { id: "999" };
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock reanimated
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (c: unknown) => c,
      View: RN.View,
      Text: RN.Text,
    },
    Easing: { in: jest.fn(), out: jest.fn(), inOut: jest.fn(), bezier: jest.fn() },
    useSharedValue: jest.fn((init: number) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val: number) => val),
    withRepeat: jest.fn((val: number) => val),
    withSequence: jest.fn((...vals: number[]) => vals[0]),
    createAnimatedComponent: (c: unknown) => c,
    runOnJS: jest.fn((fn: unknown) => fn),
    useAnimatedReaction: jest.fn(),
    useDerivedValue: jest.fn((fn: () => unknown) => ({ value: fn() })),
    useAnimatedScrollHandler: jest.fn(),
    interpolate: jest.fn(),
  };
});

// Mock heroui-native
jest.mock("heroui-native", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import SessionDetailScreen from "../[id]";

const fakeSession: Session = {
  id: 1,
  workoutId: 1,
  workoutTitle: "Push Day",
  startedAt: Date.UTC(2026, 1, 27, 14, 32, 0),
  finishedAt: Date.UTC(2026, 1, 27, 15, 17, 30),
  durationSeconds: 2730,
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
  ],
};

function renderWithSession(session: Session) {
  const Wrapper = () => {
    const { dispatch, state } = useWorkout();
    React.useEffect(() => {
      if (!state.sessions.find((s) => s.id === session.id)) {
        dispatch({ type: "ADD_SESSION", payload: session });
      }
    }, [dispatch, state.sessions]);

    if (state.sessions.length === 0) return null;
    return <SessionDetailScreen />;
  };

  return render(
    <WorkoutProvider>
      <Wrapper />
    </WorkoutProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: "999" };
});

describe("SessionDetailScreen", () => {
  it("shows not-found state for invalid session ID", () => {
    mockParams = { id: "999" };
    render(
      <WorkoutProvider>
        <SessionDetailScreen />
      </WorkoutProvider>,
    );
    expect(screen.getByText("Session not found")).toBeTruthy();
  });

  it("renders header with workout name, date, duration, and volume", () => {
    mockParams = { id: "1" };
    renderWithSession(fakeSession);
    expect(screen.getByText("Push Day")).toBeTruthy();
    expect(screen.getByText(/27 Feb 2026/)).toBeTruthy();
    expect(screen.getByText("45m 30s")).toBeTruthy();
    expect(screen.getByText("2000 kg")).toBeTruthy();
  });

  it("renders exercise breakdown with set details", () => {
    mockParams = { id: "1" };
    renderWithSession(fakeSession);
    // Exercise names
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("OHP")).toBeTruthy();
    // Set rows (weight × reps)
    expect(screen.getAllByText("100 kg").length).toBe(2);
    expect(screen.getByText("60 kg")).toBeTruthy();
    // Actual reps
    expect(screen.getByText("8/8")).toBeTruthy();
    expect(screen.getByText("6/8")).toBeTruthy();
    expect(screen.getByText("10/10")).toBeTruthy();
  });

  it("back button calls router.back()", () => {
    mockParams = { id: "1" };
    renderWithSession(fakeSession);
    fireEvent.press(screen.getByTestId("back-btn"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
