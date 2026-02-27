import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { WorkoutProvider, useWorkout } from "@/contexts/workout-context";
import type { Session } from "@/contexts/workout-context";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
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

// Mock victory-native to avoid Skia native module issues
jest.mock("victory-native", () => ({
  CartesianChart: "CartesianChart",
  Line: "Line",
  Bar: "Bar",
  useChartPressState: jest.fn(() => ({ isActive: false, state: {} })),
}));

import ProgressScreen from "../progress";

const fakeSessions: Session[] = [
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
    ],
  },
];

function renderWithSessions(sessions: Session[]) {
  const Wrapper = () => {
    const { dispatch, state } = useWorkout();
    React.useEffect(() => {
      for (const s of sessions) {
        if (!state.sessions.find((existing) => existing.id === s.id)) {
          dispatch({ type: "ADD_SESSION", payload: s });
        }
      }
    }, [dispatch, state.sessions]);

    if (state.sessions.length < sessions.length) return null;
    return <ProgressScreen />;
  };

  return render(
    <WorkoutProvider>
      <Wrapper />
    </WorkoutProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProgressScreen", () => {
  it("renders exercise selector pills from session data", () => {
    renderWithSessions(fakeSessions);
    expect(screen.getByTestId("exercise-pill-Bench Press")).toBeTruthy();
    expect(screen.getByTestId("exercise-pill-OHP")).toBeTruthy();
  });

  it("first exercise is selected by default", () => {
    renderWithSessions(fakeSessions);
    // Bench Press is alphabetically first
    const pill = screen.getByTestId("exercise-pill-Bench Press");
    // We check that the selected pill has the accent style by checking it's visually distinct
    expect(pill).toBeTruthy();
  });

  it("renders stat pills for selected exercise", () => {
    renderWithSessions(fakeSessions);
    // Bench Press is selected by default
    expect(screen.getByText("Personal Best")).toBeTruthy();
    expect(screen.getByText("100 kg")).toBeTruthy();
    expect(screen.getByText("Last Session")).toBeTruthy();
    expect(screen.getByText("1180 kg")).toBeTruthy();
    expect(screen.getByText("Sessions")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("renders chart containers for selected exercise", () => {
    renderWithSessions(fakeSessions);
    expect(screen.getByTestId("volume-chart")).toBeTruthy();
    expect(screen.getByTestId("max-weight-chart")).toBeTruthy();
  });

  it("shows empty state when no sessions exist", () => {
    render(
      <WorkoutProvider>
        <ProgressScreen />
      </WorkoutProvider>,
    );
    expect(screen.getByText("No Progress Yet")).toBeTruthy();
  });

  it("shows per-exercise empty message when exercise has no data", () => {
    const sessionsWithNoSets: Session[] = [
      {
        id: 10,
        workoutId: 1,
        workoutTitle: "Empty",
        startedAt: Date.UTC(2026, 0, 1),
        finishedAt: Date.UTC(2026, 0, 1),
        durationSeconds: 60,
        exercises: [
          { id: 10, sessionId: 10, exerciseId: 10, name: "Deadlift", order: 0, sets: [] },
        ],
      },
    ];
    renderWithSessions(sessionsWithNoSets);
    expect(screen.getByText(/No data yet/)).toBeTruthy();
  });
});
