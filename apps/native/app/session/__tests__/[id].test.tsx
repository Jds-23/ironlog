import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { WorkoutProvider } from "@/contexts/workout-context";

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

// Mock trpc
const mockSessionGetById = jest.fn();
jest.mock("@/utils/trpc", () => ({
  trpc: {
    session: {
      getById: {
        queryOptions: (input: { id: number }) => ({
          queryKey: ["session", "getById", input],
          queryFn: () => mockSessionGetById(input),
        }),
      },
    },
  },
  queryClient: new (require("@tanstack/react-query").QueryClient)(),
}));

import SessionDetailScreen from "../[id]";

const serverSession = {
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
          done: 0,
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
        <SessionDetailScreen />
      </WorkoutProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: "999" };
});

describe("SessionDetailScreen", () => {
  it("shows not-found state when query returns no data", async () => {
    mockParams = { id: "999" };
    const qc = createQueryClient();
    mockSessionGetById.mockResolvedValue(undefined);
    renderWithProviders(qc);

    // Wait for query to resolve
    await screen.findByText("Session not found");
  });

  it("renders header with workout name, date, duration, and volume", async () => {
    mockParams = { id: "1" };
    const qc = createQueryClient();
    mockSessionGetById.mockResolvedValue(serverSession);
    renderWithProviders(qc);

    expect(await screen.findByText("Push Day")).toBeTruthy();
    expect(screen.getByText(/27 Feb 2026/)).toBeTruthy();
    expect(screen.getByText("45m 30s")).toBeTruthy();
    expect(screen.getByText("2000 kg")).toBeTruthy();
  });

  it("renders exercise breakdown with set details, done=1 maps to checkmark", async () => {
    mockParams = { id: "1" };
    const qc = createQueryClient();
    mockSessionGetById.mockResolvedValue(serverSession);
    renderWithProviders(qc);

    await screen.findByText("Push Day");
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("OHP")).toBeTruthy();
    expect(screen.getAllByText("100 kg").length).toBe(2);
    expect(screen.getByText("60 kg")).toBeTruthy();
    expect(screen.getByText("8/8")).toBeTruthy();
    expect(screen.getByText("6/8")).toBeTruthy();
    expect(screen.getByText("10/10")).toBeTruthy();
    // done=1 → ✓, done=0 → ○
    expect(screen.getAllByText("✓").length).toBe(2);
    expect(screen.getAllByText("○").length).toBe(1);
  });

  it("back button calls router.back()", async () => {
    mockParams = { id: "1" };
    const qc = createQueryClient();
    mockSessionGetById.mockResolvedValue(serverSession);
    renderWithProviders(qc);

    await screen.findByText("Push Day");
    fireEvent.press(screen.getByTestId("back-btn"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
