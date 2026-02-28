import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { WorkoutProvider } from "@/contexts/workout-context";

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

// Mock heroui-native
jest.mock("heroui-native", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock trpc
const mockWorkoutGetById = jest.fn();
const mockSessionCreate = jest.fn();
jest.mock("@/utils/trpc", () => ({
  trpc: {
    workout: {
      getById: {
        queryOptions: (input: { id: number }) => ({
          queryKey: ["workout", "getById", input],
          queryFn: () => mockWorkoutGetById(input),
        }),
      },
    },
    session: {
      create: {
        mutationOptions: () => ({
          mutationFn: mockSessionCreate,
        }),
      },
    },
  },
  queryClient: new (require("@tanstack/react-query").QueryClient)(),
}));

import LogSessionScreen from "../[workoutId]";

const serverWorkout = {
  id: 1,
  title: "Push Day",
  createdAt: new Date("2025-01-15"),
  exercises: [
    {
      id: 10,
      workoutId: 1,
      name: "Bench Press",
      order: 0,
      setTemplates: [
        { id: 100, exerciseId: 10, weight: 135, targetReps: 8, order: 0 },
        { id: 101, exerciseId: 10, weight: 135, targetReps: 8, order: 1 },
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function renderScreen(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkoutProvider>
        <LogSessionScreen />
      </WorkoutProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LogSessionScreen", () => {
  it("renders workout name and exercises from tRPC query", async () => {
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    renderScreen(qc);

    expect(await screen.findByText("Push Day")).toBeTruthy();
    expect(screen.getAllByText("Bench Press").length).toBeGreaterThan(0);
    expect(screen.getByText("OHP")).toBeTruthy();
  });

  it("renders set rows with weight and reps cells", async () => {
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    renderScreen(qc);

    await screen.findByText("Push Day");
    const weightCells = screen.getAllByTestId(/^weight-cell-/);
    expect(weightCells.length).toBe(3);
    expect(weightCells[0]).toHaveTextContent("135");
  });

  it("check button toggles set done", async () => {
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    renderScreen(qc);

    await screen.findByText("Push Day");
    const checkBtns = screen.getAllByTestId(/^check-btn-/);
    fireEvent.press(checkBtns[0]);
    expect(screen.getByTestId("progress-badge")).toHaveTextContent("1/3");
  });

  it("shows progress badge with 0/total initially", async () => {
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    renderScreen(qc);

    await screen.findByText("Push Day");
    expect(screen.getByTestId("progress-badge")).toHaveTextContent("0/3");
  });

  it("finish calls session.create mutation and navigates", async () => {
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    mockSessionCreate.mockResolvedValue({ id: 1 });
    renderScreen(qc);

    await screen.findByText("Push Day");
    fireEvent.press(screen.getByTestId("finish-btn"));

    await waitFor(() => {
      expect(mockSessionCreate.mock.calls[0][0]).toMatchObject({
        workoutId: 1,
        workoutTitle: "Push Day",
        exercises: expect.arrayContaining([expect.objectContaining({ name: "Bench Press" })]),
      });
    });
    expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)/workouts");
  });
});
