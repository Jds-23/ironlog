import { env } from "@ironlog/env/server";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export const db = drizzle(env.DB, { schema });

export { eq, desc } from "drizzle-orm";
