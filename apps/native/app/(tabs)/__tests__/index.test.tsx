import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import React from "react";

import { WorkoutProvider } from "@/contexts/workout-context";

// Mock expo-router
const mockRouter = { push: jest.fn() };
jest.mock("expo-router", () => ({
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
const mockWorkoutList = jest.fn();
const mockSessionList = jest.fn();
jest.mock("@/utils/trpc", () => ({
  trpc: {
    workout: {
      list: {
        queryOptions: () => ({
          queryKey: ["workout", "list"],
          queryFn: mockWorkoutList,
        }),
      },
    },
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

import HomeScreen from "../index";

const serverWorkouts = [
  {
    id: 1,
    title: "Push Day",
    createdAt: new Date("2026-01-15"),
    exercises: [
      {
        id: 10,
        workoutId: 1,
        name: "Bench Press",
        order: 0,
        setTemplates: [{ id: 100, exerciseId: 10, weight: 100, targetReps: 8, order: 0 }],
      },
    ],
  },
  {
    id: 2,
    title: "Leg Day",
    createdAt: new Date("2026-01-16"),
    exercises: [
      {
        id: 20,
        workoutId: 2,
        name: "Squats",
        order: 0,
        setTemplates: [{ id: 200, exerciseId: 20, weight: 120, targetReps: 5, order: 0 }],
      },
    ],
  },
];

const serverSessions = [
  {
    id: 1,
    workoutId: 1,
    workoutTitle: "Push Day",
    startedAt: Date.UTC(2026, 1, 27, 14, 0, 0),
    finishedAt: Date.UTC(2026, 1, 27, 15, 0, 0),
    durationSeconds: 3600,
    totalSetsDone: 5,
    totalVolume: 3000,
    loggedExercises: [],
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
        <HomeScreen />
      </WorkoutProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("HomeScreen", () => {
  it("shows greeting text", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    const greeting = await screen.findByTestId("greeting");
    expect(greeting.props.children).toMatch(/Good (morning|afternoon|evening)/);
    expect(screen.getByText("Ready to train?")).toBeTruthy();
  });

  it("renders stats cards with correct counts", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByTestId("greeting");
    expect(screen.getByText("2")).toBeTruthy(); // workout count
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1); // session count
    expect(screen.getByText("Workouts")).toBeTruthy();
    expect(screen.getByText("Sessions")).toBeTruthy();
    expect(screen.getByText("Day Streak")).toBeTruthy();
  });

  it("renders recent workout cards", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByTestId("greeting");
    // "Push Day" appears in both workout card and last session card
    expect(screen.getAllByText("Push Day").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Leg Day")).toBeTruthy();
    expect(screen.getByText("RECENT WORKOUTS")).toBeTruthy();
  });

  it("renders last session card", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByTestId("greeting");
    expect(screen.getByText("LAST SESSION")).toBeTruthy();
    expect(screen.getByText("1h 0m")).toBeTruthy();
    expect(screen.getByText("5 sets")).toBeTruthy();
    expect(screen.getByText("3000 kg")).toBeTruthy();
  });

  it("shows empty states when no data", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue([]);
    mockSessionList.mockResolvedValue([]);
    renderWithProviders(qc);

    await screen.findByTestId("greeting");
    expect(screen.getByText("Create a workout to get started")).toBeTruthy();
    expect(screen.getByText("Complete a workout to see your summary")).toBeTruthy();
  });

  it("navigates on workout card press", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByTestId("greeting");
    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(screen.getByTestId("workout-card-1"));
    expect(mockRouter.push).toHaveBeenCalledWith("/workout/1");
  });

  it("navigates on Start button press", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByTestId("greeting");
    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(screen.getByTestId("start-workout-1"));
    expect(mockRouter.push).toHaveBeenCalledWith("/log/1");
  });

  it("navigates on last session card press", async () => {
    const qc = createQueryClient();
    mockWorkoutList.mockResolvedValue(serverWorkouts);
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByTestId("greeting");
    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(screen.getByTestId("last-session-1"));
    expect(mockRouter.push).toHaveBeenCalledWith("/session/1");
  });
});
