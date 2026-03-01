import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, db, desc, eq, gte, isNull, lte, sql } from "@ironlog/db";
import { metricDefinitions, metricEntries } from "@ironlog/db/schema";

import { protectedProcedure, router } from "../index";

export const upsertDefinitionInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  unit: z.string().trim().min(1),
});

export const listEntriesInput = z.object({
  metricDefinitionId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const upsertEntryInput = z.object({
  metricDefinitionId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number(),
});

export const metricsRouter = router({
  listDefinitions: protectedProcedure.query(async ({ ctx }) => {
    return db.query.metricDefinitions.findMany({
      where: and(eq(metricDefinitions.userId, ctx.userId), isNull(metricDefinitions.deletedAt)),
      orderBy: metricDefinitions.name,
    });
  }),

  upsertDefinition: protectedProcedure
    .input(upsertDefinitionInput)
    .mutation(async ({ input, ctx }) => {
      if (input.id) {
        const existing = await db.query.metricDefinitions.findFirst({
          where: and(
            eq(metricDefinitions.id, input.id),
            eq(metricDefinitions.userId, ctx.userId),
            isNull(metricDefinitions.deletedAt),
          ),
        });
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Metric definition not found" });
        }
        await db
          .update(metricDefinitions)
          .set({ name: input.name, unit: input.unit })
          .where(eq(metricDefinitions.id, input.id));
        return db.query.metricDefinitions.findFirst({
          where: eq(metricDefinitions.id, input.id),
        });
      }
      const [inserted] = await db
        .insert(metricDefinitions)
        .values({ userId: ctx.userId, name: input.name, unit: input.unit })
        .returning();
      return inserted;
    }),

  deleteDefinition: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.query.metricDefinitions.findFirst({
        where: and(
          eq(metricDefinitions.id, input.id),
          eq(metricDefinitions.userId, ctx.userId),
          isNull(metricDefinitions.deletedAt),
        ),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Metric definition not found" });
      }
      await db
        .update(metricDefinitions)
        .set({ deletedAt: new Date() })
        .where(eq(metricDefinitions.id, input.id));
      return { success: true };
    }),

  listEntries: protectedProcedure.input(listEntriesInput).query(async ({ input, ctx }) => {
    const conditions = [
      eq(metricEntries.userId, ctx.userId),
      eq(metricEntries.metricDefinitionId, input.metricDefinitionId),
      isNull(metricEntries.deletedAt),
    ];
    if (input.startDate) {
      conditions.push(gte(metricEntries.date, input.startDate));
    }
    if (input.endDate) {
      conditions.push(lte(metricEntries.date, input.endDate));
    }
    return db.query.metricEntries.findMany({
      where: and(...conditions),
      orderBy: desc(metricEntries.date),
    });
  }),

  upsertEntry: protectedProcedure.input(upsertEntryInput).mutation(async ({ input, ctx }) => {
    const [result] = await db
      .insert(metricEntries)
      .values({
        userId: ctx.userId,
        metricDefinitionId: input.metricDefinitionId,
        date: input.date,
        value: input.value,
      })
      .onConflictDoUpdate({
        target: [metricEntries.metricDefinitionId, metricEntries.date],
        set: {
          value: sql`excluded.value`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }),

  deleteEntry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.query.metricEntries.findFirst({
        where: and(
          eq(metricEntries.id, input.id),
          eq(metricEntries.userId, ctx.userId),
          isNull(metricEntries.deletedAt),
        ),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Metric entry not found" });
      }
      await db
        .update(metricEntries)
        .set({ deletedAt: new Date() })
        .where(eq(metricEntries.id, input.id));
      return { success: true };
    }),
});
