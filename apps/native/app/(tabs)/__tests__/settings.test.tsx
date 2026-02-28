import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

// Mock auth client
const mockSignOut = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
const mockUseSession = jest.fn();
jest.mock("@/lib/auth-client", () => {
  return {
    authClient: {
      useSession: (...args: unknown[]) => mockUseSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  };
});

// Mock trpc
const mockClear = jest.fn();
jest.mock("@/utils/trpc", () => ({
  queryClient: { clear: (...args: unknown[]) => mockClear(...args) },
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

// Mock safe area
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import SettingsScreen from "../settings";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({
    data: { user: { id: "1", email: "test@example.com", name: "Test User" } },
    isPending: false,
  });
});

describe("Settings screen", () => {
  it("renders user email", () => {
    render(<SettingsScreen />);

    expect(screen.getByText("test@example.com")).toBeTruthy();
  });

  it("renders sign-out button", () => {
    render(<SettingsScreen />);

    expect(screen.getByText("Sign Out")).toBeTruthy();
  });

  it("calls signOut and clears cache on press", async () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Sign Out"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockClear).toHaveBeenCalled();
    });
  });
});
