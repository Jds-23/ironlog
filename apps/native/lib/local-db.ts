import { createLocalDb } from "@ironlog/db/client";
import { openDatabaseSync } from "expo-sqlite";

const expoDb = openDatabaseSync("ironlog.db");

export const localDb = createLocalDb(expoDb);
