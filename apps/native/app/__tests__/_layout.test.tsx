import { render, screen } from "@testing-library/react-native";
import React from "react";

// Mock CSS import
jest.mock("@/global.css", () => {});

// Mock auth client
const mockUseSession = jest.fn();
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

// Mock expo-router
const mockReplace = jest.fn();
const mockUseSegments = jest.fn<() => string[]>().mockReturnValue([]);
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: (...args: unknown[]) => mockReplace(...args) }),
  useSegments: () => mockUseSegments(),
  Stack: Object.assign(
    ({ children }: { children: React.ReactNode }) => {
      const { View } = require("react-native");
      return <View testID="stack">{children}</View>;
    },
    {
      Screen: ({ name }: { name: string }) => {
        const { View } = require("react-native");
        return <View testID={`screen-${name}`} />;
      },
    },
  ),
}));

// Mock expo-splash-screen
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// Mock expo-font
jest.mock("expo-font", () => ({
  useFonts: () => [true],
}));

// Mock font packages
jest.mock("@expo-google-fonts/bebas-neue", () => ({
  BebasNeue_400Regular: "BebasNeue_400Regular",
}));
jest.mock("@expo-google-fonts/dm-sans", () => ({
  DMSans_400Regular: "DMSans_400Regular",
  DMSans_500Medium: "DMSans_500Medium",
  DMSans_600SemiBold: "DMSans_600SemiBold",
}));

// Mock providers that wrap the app
jest.mock("@tanstack/react-query", () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("react-native-keyboard-controller", () => ({
  KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("heroui-native", () => ({
  HeroUINativeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/contexts/app-theme-context", () => ({
  AppThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/contexts/workout-context", () => ({
  WorkoutProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/utils/trpc", () => ({
  queryClient: { clear: jest.fn() },
}));

import Layout from "../_layout";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSegments.mockReturnValue([]);
});

describe("Root Layout auth gate", () => {
  it("redirects to sign-in when unauthenticated", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false });

    render(<Layout />);

    expect(mockReplace).toHaveBeenCalledWith("/(auth)/sign-in");
  });

  it("returns null while session is loading", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true });

    const { toJSON } = render(<Layout />);

    expect(toJSON()).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders stack when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", email: "test@example.com", name: "Test" } },
      isPending: false,
    });

    render(<Layout />);

    expect(screen.getByTestId("stack")).toBeTruthy();
    expect(screen.getByTestId("screen-(tabs)")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to tabs when authenticated user is on auth screen", () => {
    mockUseSegments.mockReturnValue(["(auth)"]);
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", email: "test@example.com", name: "Test" } },
      isPending: false,
    });

    render(<Layout />);

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });
});
