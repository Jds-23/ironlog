import type { LocalDatabase } from "@ironlog/db/client";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import React, { createContext, useContext } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { localDb } from "./local-db";
import migrations from "@ironlog/db/local-migrations/migrations";

const LocalDbContext = createContext<LocalDatabase | null>(null);

export function LocalDbProvider({ children }: { children: React.ReactNode }) {
  const { success, error } = useMigrations(localDb, migrations);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>Migration error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <LocalDbContext.Provider value={localDb}>{children}</LocalDbContext.Provider>;
}

export function useLocalDb(): LocalDatabase {
  const db = useContext(LocalDbContext);
  if (!db) {
    throw new Error("useLocalDb must be used within a LocalDbProvider");
  }
  return db;
}
