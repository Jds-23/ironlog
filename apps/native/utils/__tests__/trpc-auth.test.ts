import { Platform } from "react-native";

jest.mock("@ironlog/env/native", () => ({
  env: { EXPO_PUBLIC_SERVER_URL: "http://localhost:3000" },
}));

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    getCookie: jest.fn(),
  },
}));

jest.mock("@trpc/client", () => ({
  createTRPCClient: jest.fn(() => ({})),
  httpBatchLink: jest.fn(() => ({})),
}));

jest.mock("@trpc/tanstack-react-query", () => ({
  createTRPCOptionsProxy: jest.fn(() => ({})),
}));

import { authClient } from "@/lib/auth-client";
import { getAuthHeaders } from "../trpc";

const mockGetCookie = authClient.getCookie as jest.Mock;

describe("getAuthHeaders", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns Cookie header when authClient has cookies (native)", () => {
    Platform.OS = "ios";
    mockGetCookie.mockReturnValue("better-auth.session_token=abc123");

    const headers = getAuthHeaders();

    expect(headers).toEqual({ Cookie: "better-auth.session_token=abc123" });
  });

  it("returns empty object when authClient returns null (native)", () => {
    Platform.OS = "android";
    mockGetCookie.mockReturnValue(null);

    const headers = getAuthHeaders();

    expect(headers).toEqual({});
  });

  it("returns empty object on web regardless of cookies", () => {
    Platform.OS = "web";
    mockGetCookie.mockReturnValue("better-auth.session_token=abc123");

    const headers = getAuthHeaders();

    expect(headers).toEqual({});
  });
});
