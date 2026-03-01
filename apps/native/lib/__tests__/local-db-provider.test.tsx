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

import React from "react";
import { renderHook } from "@testing-library/react-native";
import { LocalDbProvider, useLocalDb } from "../local-db-provider";

describe("LocalDbProvider", () => {
  it("provides a db instance via useLocalDb", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocalDbProvider>{children}</LocalDbProvider>
    );

    const { result } = renderHook(() => useLocalDb(), { wrapper });

    expect(result.current).toBeDefined();
    expect(typeof result.current.select).toBe("function");
  });

  it("throws when useLocalDb is called outside LocalDbProvider", () => {
    expect(() => {
      renderHook(() => useLocalDb());
    }).toThrow();
  });
});
