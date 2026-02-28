import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import React from "react";

import { WorkoutProvider } from "@/contexts/workout-context";

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

// Mock trpc
const mockSessionList = jest.fn();
jest.mock("@/utils/trpc", () => ({
  trpc: {
    session: {
      list: {
        queryOptions: () => ({
          queryKey: ["session", "list"],
          queryFn: mockSessionList,
        }),
      },
    },
  },
  queryClient: new (require("@tanstack/react-query").QueryClient)(),
}));

import ProgressScreen from "../progress";

const serverSessions = [
  {
    id: 1,
    workoutId: 1,
    workoutTitle: "Push",
    startedAt: Date.UTC(2026, 1, 25, 10, 0, 0),
    finishedAt: Date.UTC(2026, 1, 25, 11, 0, 0),
    durationSeconds: 3600,
    totalSetsDone: 3,
    totalVolume: 1680,
    loggedExercises: [
      {
        id: 1,
        sessionId: 1,
        exerciseId: 1,
        name: "Bench Press",
        order: 0,
        loggedSets: [
          {
            id: 1,
            loggedExerciseId: 1,
            weight: 80,
            targetReps: 8,
            actualReps: 8,
            done: 1,
            order: 0,
          },
          {
            id: 2,
            loggedExerciseId: 1,
            weight: 90,
            targetReps: 6,
            actualReps: 6,
            done: 1,
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
        loggedSets: [
          {
            id: 3,
            loggedExerciseId: 2,
            weight: 50,
            targetReps: 10,
            actualReps: 10,
            done: 1,
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
    totalSetsDone: 2,
    totalVolume: 1180,
    loggedExercises: [
      {
        id: 3,
        sessionId: 2,
        exerciseId: 1,
        name: "Bench Press",
        order: 0,
        loggedSets: [
          {
            id: 5,
            loggedExerciseId: 3,
            weight: 85,
            targetReps: 8,
            actualReps: 8,
            done: 1,
            order: 0,
          },
          {
            id: 6,
            loggedExerciseId: 3,
            weight: 100,
            targetReps: 6,
            actualReps: 5,
            done: 1,
            order: 1,
          },
        ],
      },
    ],
  },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function renderWithProviders(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkoutProvider>
        <ProgressScreen />
      </WorkoutProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProgressScreen", () => {
  it("renders exercise selector pills from tRPC session data", async () => {
    const qc = createQueryClient();
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    expect(await screen.findByTestId("exercise-pill-Bench Press")).toBeTruthy();
    expect(screen.getByTestId("exercise-pill-OHP")).toBeTruthy();
  });

  it("renders stat pills for selected exercise", async () => {
    const qc = createQueryClient();
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByText("Personal Best");
    expect(screen.getByText("100 kg")).toBeTruthy();
    expect(screen.getByText("Last Session")).toBeTruthy();
    expect(screen.getByText("1180 kg")).toBeTruthy();
    expect(screen.getByText("Sessions")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("renders chart containers for selected exercise", async () => {
    const qc = createQueryClient();
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByText("Personal Best");
    expect(screen.getByTestId("volume-chart")).toBeTruthy();
    expect(screen.getByTestId("max-weight-chart")).toBeTruthy();
  });

  it("shows empty state when no sessions exist", async () => {
    const qc = createQueryClient();
    mockSessionList.mockResolvedValue([]);
    renderWithProviders(qc);

    expect(await screen.findByText("No Progress Yet")).toBeTruthy();
  });
});
