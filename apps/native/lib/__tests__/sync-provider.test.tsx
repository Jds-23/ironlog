jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => "mock-sqlite-db"),
}));

jest.mock("@ironlog/db/client", () => ({
  createLocalDb: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  })),
}));

jest.mock("drizzle-orm/expo-sqlite/migrator", () => ({
  useMigrations: jest.fn(() => ({ success: true, error: undefined })),
}));

jest.mock("@ironlog/db/local-migrations/migrations", () => ({
  default: { journal: { entries: [] }, migrations: {} },
}));

jest.mock("expo-network", () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock("../local-db-provider", () => {
  const mockDb = {
    select: jest.fn(() => ({ from: jest.fn(() => ({ all: jest.fn(() => []) })) })),
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  return {
    useLocalDb: jest.fn(() => mockDb),
    LocalDbProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("@/utils/trpc", () => ({
  trpc: {},
  queryClient: {},
}));

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession: jest.fn().mockResolvedValue({}),
  },
}));

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { SyncProvider, useSyncStatus } from "../sync-provider";
import * as Network from "expo-network";

describe("SyncProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: true });
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <SyncProvider>{children}</SyncProvider>;
  }

  it("provides synced status after successful init", async () => {
    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    await waitFor(() => {
      expect(["synced", "syncing"]).toContain(result.current.status);
    });
  });

  it("provides offline status when network unavailable", async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: false });

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe("offline");
    });
  });

  it("exposes notifyWrite as a function", async () => {
    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    await waitFor(() => {
      expect(typeof result.current.notifyWrite).toBe("function");
    });
  });
});
