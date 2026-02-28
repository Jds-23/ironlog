import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import { WorkoutProvider } from "@/contexts/workout-context";

// Mock expo-router
const mockRouter = { back: jest.fn(), push: jest.fn() };
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

// Mock trpc
const mockWorkoutGetById = jest.fn();
const mockWorkoutDelete = jest.fn();
jest.mock("@/utils/trpc", () => ({
  trpc: {
    workout: {
      getById: {
        queryOptions: (input: { id: number }) => ({
          queryKey: ["workout", "getById", input],
          queryFn: () => mockWorkoutGetById(input),
        }),
      },
      delete: {
        mutationOptions: () => ({
          mutationFn: mockWorkoutDelete,
        }),
      },
      create: {
        mutationOptions: () => ({
          mutationFn: jest.fn(),
        }),
      },
      update: {
        mutationOptions: () => ({
          mutationFn: jest.fn(),
        }),
      },
    },
  },
  queryClient: new (require("@tanstack/react-query").QueryClient)(),
}));

// Mock exercise-autocomplete (used by WorkoutFormSheet)
jest.mock("@/components/exercise-autocomplete", () => ({
  ExerciseAutocomplete: () => null,
}));

import WorkoutDetailScreen from "../[id]";

const serverWorkout = {
  id: 1,
  title: "Push Day",
  createdAt: new Date("2026-01-15"),
  exercises: [
    {
      id: 10,
      workoutId: 1,
      name: "Bench Press",
      order: 0,
      setTemplates: [
        { id: 100, exerciseId: 10, weight: 100, targetReps: 8, order: 0 },
        { id: 101, exerciseId: 10, weight: 100, targetReps: 6, order: 1 },
      ],
    },
    {
      id: 11,
      workoutId: 1,
      name: "OHP",
      order: 1,
      setTemplates: [{ id: 102, exerciseId: 11, weight: 60, targetReps: 10, order: 0 }],
    },
  ],
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function renderWithProviders(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkoutProvider>
        <WorkoutDetailScreen />
      </WorkoutProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: "999" };
});

describe("WorkoutDetailScreen", () => {
  it("shows not-found state when query returns no data", async () => {
    mockParams = { id: "999" };
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(undefined);
    renderWithProviders(qc);

    await screen.findByText("Workout not found");
  });

  it("renders title, exercises, and sets", async () => {
    mockParams = { id: "1" };
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    renderWithProviders(qc);

    expect(await screen.findByText("Push Day")).toBeTruthy();
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("OHP")).toBeTruthy();
    expect(screen.getAllByText("100 kg").length).toBe(2);
    expect(screen.getByText("60 kg")).toBeTruthy();
    expect(screen.getByText("2 exercises \u00b7 3 sets")).toBeTruthy();
  });

  it("back button calls router.back()", async () => {
    mockParams = { id: "1" };
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    renderWithProviders(qc);

    await screen.findByText("Push Day");
    fireEvent.press(screen.getByTestId("back-btn"));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("Start button navigates to log screen", async () => {
    mockParams = { id: "1" };
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    renderWithProviders(qc);

    await screen.findByText("Push Day");
    fireEvent.press(screen.getByTestId("start-btn"));
    expect(mockRouter.push).toHaveBeenCalledWith("/log/1");
  });

  it("Delete button shows alert and triggers mutation", async () => {
    mockParams = { id: "1" };
    const qc = createQueryClient();
    mockWorkoutGetById.mockResolvedValue(serverWorkout);
    mockWorkoutDelete.mockResolvedValue({ success: true });
    const alertSpy = jest.spyOn(Alert, "alert");
    renderWithProviders(qc);

    await screen.findByText("Push Day");
    fireEvent.press(screen.getByTestId("delete-btn"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Workout",
      "Are you sure you want to delete this workout?",
      expect.any(Array),
    );

    // Simulate pressing "Delete" in the alert
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    const deleteButton = buttons.find((b) => b.text === "Delete");
    deleteButton?.onPress?.();

    await waitFor(() => {
      expect(mockWorkoutDelete.mock.calls[0][0]).toEqual({ id: 1 });
    });
  });
});
