import { TRPCError } from "@trpc/server";
import { db, and, eq, gt } from "@ironlog/db";
import {
  workouts,
  exercises,
  setTemplates,
  sessions,
  loggedExercises,
  loggedSets,
  metricDefinitions,
  metricEntries,
} from "@ironlog/db/schema";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

const syncableTableNames = [
  "workouts",
  "exercises",
  "setTemplates",
  "sessions",
  "loggedExercises",
  "loggedSets",
  "metricDefinitions",
  "metricEntries",
] as const;

// All syncable tables share id, userId, updatedAt, deletedAt columns
const tableRegistry = {
  workouts,
  exercises,
  setTemplates,
  sessions,
  loggedExercises,
  loggedSets,
  metricDefinitions,
  metricEntries,
} as const;

const changeItemSchema = z.object({
  table: z.enum(syncableTableNames),
  id: z.string(),
  data: z.record(z.string(), z.unknown()),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
});

const pushInputSchema = z.object({
  changes: z.array(changeItemSchema),
});

function toDate(ms: number): Date {
  return new Date(ms);
}

function serializeRow(row: Record<string, unknown>, tableName: string): Record<string, unknown> {
  const result: Record<string, unknown> = { table: tableName };
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      result[key] = value.getTime();
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const syncRouter = router({
  push: protectedProcedure.input(pushInputSchema).mutation(async ({ input, ctx }) => {
    for (const change of input.changes) {
      const table = tableRegistry[change.table];

      // Check if row already exists for this user
      const existing = await db
        .select()
        .from(table)
        .where(and(eq(table.id, change.id), eq(table.userId, ctx.userId)))
        .get();

      const row: Record<string, unknown> = {
        ...change.data,
        id: change.id,
        userId: ctx.userId,
        updatedAt: toDate(change.updatedAt),
      };

      // Convert createdAt if present in data
      if ("createdAt" in change.data && typeof change.data.createdAt === "number") {
        row.createdAt = toDate(change.data.createdAt as number);
      }

      if (change.deletedAt != null) {
        row.deletedAt = toDate(change.deletedAt);
      }

      if (!existing) {
        try {
          // biome-ignore lint: dynamic table values from registry
          await db
            .insert(table)
            .values(row as any)
            .run();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("FOREIGN KEY constraint failed")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Foreign key constraint failed for ${change.table} id=${change.id}`,
            });
          }
          throw e;
        }
      } else {
        // LWW: only update if incoming is newer
        // Drizzle timestamp_ms mode returns Date objects
        const existingUpdatedAt = (existing as Record<string, unknown>).updatedAt;
        const existingMs =
          existingUpdatedAt instanceof Date
            ? existingUpdatedAt.getTime()
            : (existingUpdatedAt as number);
        if (change.updatedAt > existingMs) {
          await db
            .update(table)
            .set(row)
            .where(and(eq(table.id, change.id), eq(table.userId, ctx.userId)))
            .run();
        }
        // else: stale update, skip
      }
    }

    return { success: true };
  }),

  pull: protectedProcedure.input(z.object({ cursor: z.number() })).query(async ({ input, ctx }) => {
    const cursorDate = toDate(input.cursor);

    const queryResults = await Promise.all(
      Object.entries(tableRegistry).map(async ([tableName, table]) => {
        const rows = await db
          .select()
          .from(table)
          .where(and(eq(table.userId, ctx.userId), gt(table.updatedAt, cursorDate)))
          .all();
        return rows.map((row) => serializeRow(row, tableName));
      }),
    );

    const allChanges = queryResults.flat();
    let maxUpdatedAt = input.cursor;
    for (const change of allChanges) {
      const ts = change.updatedAt as number;
      if (ts > maxUpdatedAt) {
        maxUpdatedAt = ts;
      }
    }

    return { changes: allChanges, cursor: maxUpdatedAt };
  }),
});
