import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { WorkoutProvider, useWorkout } from "@/contexts/workout-context";
import type { Exercise } from "@/contexts/workout-context";

// Mock expo-router
const mockRouter = { replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workoutId: "1" }),
  useRouter: () => mockRouter,
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success" },
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock reanimated
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  const mock = {
    __esModule: true,
    default: {
      createAnimatedComponent: (c: unknown) => c,
      View: RN.View,
      Text: RN.Text,
    },
    useSharedValue: jest.fn((init: number) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val: number) => val),
    withRepeat: jest.fn((val: number) => val),
    withSequence: jest.fn((...vals: number[]) => vals[0]),
    createAnimatedComponent: (c: unknown) => c,
  };
  return mock;
});

import LogSessionScreen from "../[workoutId]";

const exercises: Exercise[] = [
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
];

function renderScreen() {
  // Set Date.now to return 1 so workout id matches "1"
  jest.useFakeTimers();
  jest.setSystemTime(1);

  const AddWorkoutThenRender = () => {
    const { dispatch, state } = useWorkout();
    React.useEffect(() => {
      if (state.workouts.length === 0) {
        dispatch({ type: "ADD_WORKOUT", payload: { title: "Push Day", exercises } });
      }
    }, [dispatch, state.workouts.length]);

    if (state.workouts.length === 0) return null;
    return <LogSessionScreen />;
  };

  const result = render(
    <WorkoutProvider>
      <AddWorkoutThenRender />
    </WorkoutProvider>,
  );

  jest.useRealTimers();
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LogSessionScreen", () => {
  it("renders workout name and exercises", () => {
    renderScreen();
    expect(screen.getByText("Push Day")).toBeTruthy();
    expect(screen.getAllByText("Bench Press").length).toBeGreaterThan(0);
    expect(screen.getByText("OHP")).toBeTruthy();
  });

  it("renders set rows with weight and reps cells", () => {
    renderScreen();
    const weightCells = screen.getAllByTestId(/^weight-cell-/);
    expect(weightCells.length).toBe(3);
    expect(weightCells[0]).toHaveTextContent("135");
  });

  it("opens numpad on weight cell press", () => {
    renderScreen();
    const weightCells = screen.getAllByTestId(/^weight-cell-/);
    fireEvent.press(weightCells[0]);
    expect(screen.getByText("Confirm")).toBeTruthy();
    expect(screen.getByTestId("numpad-display")).toBeTruthy();
  });

  it("confirm updates weight value", () => {
    renderScreen();
    const weightCells = screen.getAllByTestId(/^weight-cell-/);
    fireEvent.press(weightCells[0]);
    // Clear existing value and type new one
    fireEvent.press(screen.getByTestId("numpad-backspace"));
    fireEvent.press(screen.getByTestId("numpad-backspace"));
    fireEvent.press(screen.getByTestId("numpad-backspace"));
    fireEvent.press(screen.getByTestId("numpad-key-4"));
    fireEvent.press(screen.getByTestId("numpad-key-0"));
    fireEvent.press(screen.getByTestId("numpad-key-0"));
    fireEvent.press(screen.getByText("Confirm"));
    expect(screen.getAllByTestId(/^weight-cell-/)[0]).toHaveTextContent("400");
  });

  it("check button toggles set done", () => {
    renderScreen();
    const checkBtns = screen.getAllByTestId(/^check-btn-/);
    fireEvent.press(checkBtns[0]);
    expect(screen.getByTestId("progress-badge")).toHaveTextContent("1/3");
  });

  it("shows progress badge with 0/total initially", () => {
    renderScreen();
    expect(screen.getByTestId("progress-badge")).toHaveTextContent("0/3");
  });

  it("marking done shows rest timer banner", () => {
    renderScreen();
    expect(screen.queryByText("REST")).toBeNull();
    const checkBtns = screen.getAllByTestId(/^check-btn-/);
    fireEvent.press(checkBtns[0]);
    expect(screen.getByText("REST")).toBeTruthy();
  });

  it("un-checking hides rest timer banner", () => {
    renderScreen();
    const checkBtns = screen.getAllByTestId(/^check-btn-/);
    // Check then uncheck
    fireEvent.press(checkBtns[0]);
    expect(screen.getByText("REST")).toBeTruthy();
    fireEvent.press(checkBtns[0]);
    expect(screen.queryByText("REST")).toBeNull();
  });

  it("bottom bar renders with Up Next info", () => {
    renderScreen();
    expect(screen.getByText("UP NEXT")).toBeTruthy();
    // First undone is Bench Press Set 1
    expect(screen.getByText(/Set 1/)).toBeTruthy();
  });

  it("all done hides Up Next", () => {
    renderScreen();
    const checkBtns = screen.getAllByTestId(/^check-btn-/);
    fireEvent.press(checkBtns[0]);
    fireEvent.press(checkBtns[1]);
    fireEvent.press(checkBtns[2]);
    expect(screen.queryByText("UP NEXT")).toBeNull();
  });

  it("finish dispatches session and navigates", () => {
    renderScreen();
    fireEvent.press(screen.getByTestId("finish-btn"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)/workouts");
  });
});
