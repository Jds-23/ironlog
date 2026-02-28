import { render, screen } from "@testing-library/react-native";
import React from "react";

// Mock auth client
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: jest.fn() },
    signUp: { email: jest.fn() },
    getCookie: jest.fn(),
  },
}));

// Mock trpc
jest.mock("@/utils/trpc", () => ({
  queryClient: { refetchQueries: jest.fn() },
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => {
    const { Text } = require("react-native");
    return <Text testID={`link-${href}`}>{children}</Text>;
  },
}));

// Mock @tanstack/react-form — return a minimal form object
jest.mock("@tanstack/react-form", () => ({
  useForm: () => ({
    handleSubmit: jest.fn(),
    Subscribe: ({ children }: any) => children({ isSubmitting: false, validationError: null }),
    Field: ({ children }: any) =>
      children({
        state: { value: "" },
        handleBlur: jest.fn(),
        handleChange: jest.fn(),
      }),
  }),
}));

import SignInScreen from "../sign-in";
import SignUpScreen from "../sign-up";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Sign In screen", () => {
  it("renders SignIn form and link to sign-up", () => {
    render(<SignInScreen />);

    expect(screen.getAllByText("Sign In").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("link-/(auth)/sign-up")).toBeTruthy();
    expect(screen.getByText("Create account")).toBeTruthy();
  });
});

describe("Sign Up screen", () => {
  it("renders SignUp form and link to sign-in", () => {
    render(<SignUpScreen />);

    expect(screen.getAllByText("Create Account").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("link-/(auth)/sign-in")).toBeTruthy();
    expect(screen.getByText("Sign in")).toBeTruthy();
  });
});
