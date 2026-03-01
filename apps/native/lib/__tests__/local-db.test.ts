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

import { openDatabaseSync } from "expo-sqlite";
import { createLocalDb } from "@ironlog/db/client";
import { localDb } from "../local-db";

describe("local-db", () => {
  it("opens an expo-sqlite database named ironlog.db", () => {
    expect(openDatabaseSync).toHaveBeenCalledWith("ironlog.db");
  });

  it("passes the sqlite db to createLocalDb", () => {
    expect(createLocalDb).toHaveBeenCalledWith("mock-sqlite-db");
  });

  it("exports a drizzle db instance", () => {
    expect(localDb).toBeDefined();
    expect(typeof localDb.select).toBe("function");
    expect(typeof localDb.insert).toBe("function");
    expect(typeof localDb.delete).toBe("function");
    expect(typeof localDb.update).toBe("function");
  });
});
