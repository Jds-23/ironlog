import { drizzle } from "drizzle-orm/expo-sqlite";

import * as schema from "./schema";

// Use Parameters to extract the expected client type from drizzle(),
// avoiding a direct import of expo-sqlite in the db package.
type ExpoSQLiteClient = Parameters<typeof drizzle>[0];

export function createLocalDb(sqliteDb: ExpoSQLiteClient) {
  return drizzle(sqliteDb, { schema });
}

export type LocalDatabase = ReturnType<typeof createLocalDb>;
