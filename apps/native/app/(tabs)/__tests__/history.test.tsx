import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { WorkoutProvider } from "@/contexts/workout-context";

// Mock expo-router
const mockRouter = { push: jest.fn(), back: jest.fn() };
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

import HistoryScreen from "../history";

const serverSessions = [
  {
    id: 1,
    workoutId: 1,
    workoutTitle: "Push Day",
    startedAt: Date.UTC(2026, 1, 27, 14, 32, 0),
    finishedAt: Date.UTC(2026, 1, 27, 15, 17, 30),
    durationSeconds: 2730,
    totalSetsDone: 3,
    totalVolume: 2000,
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
            weight: 100,
            targetReps: 8,
            actualReps: 8,
            done: 1,
            order: 0,
          },
          {
            id: 2,
            loggedExerciseId: 1,
            weight: 100,
            targetReps: 8,
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
            weight: 60,
            targetReps: 10,
            actualReps: 10,
            done: 1,
            order: 0,
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
        <HistoryScreen />
      </WorkoutProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("HistoryScreen", () => {
  it("shows empty state when no sessions exist", async () => {
    const qc = createQueryClient();
    mockSessionList.mockResolvedValue([]);
    renderWithProviders(qc);

    expect(await screen.findByText("No Sessions Yet")).toBeTruthy();
  });

  it("renders session cards with title, date, duration, and stats from tRPC", async () => {
    const qc = createQueryClient();
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    expect(await screen.findByText("Push Day")).toBeTruthy();
    expect(screen.getByText(/27 Feb 2026/)).toBeTruthy();
    expect(screen.getByText("45m 30s")).toBeTruthy();
    expect(screen.getByText("3 sets")).toBeTruthy();
    expect(screen.getByText("2000 kg")).toBeTruthy();
  });

  it("navigates to session detail on card press", async () => {
    const qc = createQueryClient();
    mockSessionList.mockResolvedValue(serverSessions);
    renderWithProviders(qc);

    await screen.findByText("Push Day");
    fireEvent.press(screen.getByTestId("session-card-1"));
    expect(mockRouter.push).toHaveBeenCalledWith("/session/1");
  });

  it("shows loading state", () => {
    const qc = createQueryClient();
    mockSessionList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(qc);

    expect(screen.getByTestId("history-loading")).toBeTruthy();
  });
});
