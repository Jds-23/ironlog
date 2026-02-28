import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
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
const mockWorkoutList = jest.fn();
const mockWorkoutCreate = jest.fn();
const mockWorkoutUpdate = jest.fn();
const mockWorkoutDelete = jest.fn();

jest.mock("@/utils/trpc", () => ({
  trpc: {
    workout: {
      list: {
        queryOptions: () => ({
          queryKey: ["workout", "list"],
          queryFn: mockWorkoutList,
        }),
      },
      create: {
        mutationOptions: () => ({
          mutationFn: mockWorkoutCreate,
        }),
      },
      update: {
        mutationOptions: () => ({
          mutationFn: mockWorkoutUpdate,
        }),
      },
      delete: {
        mutationOptions: () => ({
          mutationFn: mockWorkoutDelete,
        }),
      },
    },
  },
  queryClient: new (require("@tanstack/react-query").QueryClient)(),
}));

import WorkoutsScreen from "../workouts";

const serverWorkouts = [
  {
    id: 1,
    title: "Push Day",
    createdAt: new Date("2025-01-15"),
    exercises: [
      {
        id: 10,
        workoutId: 1,
        name: "Bench Press",
        order: 0,
        setTemplates: [{ id: 100, exerciseId: 10, weight: 135, targetReps: 8, order: 0 }],
      },
    ],
  },
  {
    id: 2,
    title: "Leg Day",
    createdAt: new Date("2025-01-16"),
    exercises: [],
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
        <WorkoutsScreen />
      </WorkoutProvider>
    </QueryClientProvider>,
  );
}

describe("WorkoutsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders workout cards from tRPC query", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    renderWithProviders(qc);

    expect(await screen.findByText("Push Day")).toBeTruthy();
    expect(screen.getByText("Leg Day")).toBeTruthy();
    expect(screen.getByText("Bench Press")).toBeTruthy();
  });

  it("shows loading state", () => {
    const qc = createQueryClient();
    mockWorkoutList.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(qc);

    expect(screen.getByTestId("workouts-loading")).toBeTruthy();
  });

  it("calls delete mutation on delete press", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    mockWorkoutDelete.mockResolvedValue({ success: true });
    renderWithProviders(qc);

    await screen.findByText("Push Day");
    const deleteButtons = screen.getAllByText(/Delete/);
    fireEvent.press(deleteButtons[0]);

    await waitFor(() => {
      expect(mockWorkoutDelete.mock.calls[0][0]).toEqual({ id: 1 });
    });
  });
});
