import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, db, desc, eq, isNull } from "@ironlog/db";
import { loggedExercises, loggedSets, sessions } from "@ironlog/db/schema";

import { protectedProcedure, router } from "../index";

export const loggedSetInput = z.object({
  weight: z.number().nullable().optional(),
  targetReps: z.number().int().nullable().optional(),
  actualReps: z.number().int().nullable().optional(),
  done: z.boolean(),
});

export const loggedExerciseInput = z.object({
  exerciseId: z.string(),
  name: z.string().min(1),
  sets: z.array(loggedSetInput),
});

export const createSessionInput = z.object({
  workoutId: z.string().nullable(),
  workoutTitle: z.string().trim().min(1),
  startedAt: z.number(),
  finishedAt: z.number(),
  durationSeconds: z.number(),
  exercises: z.array(loggedExerciseInput),
});

export function computeSessionStats(
  loggedExercises: {
    loggedSets: { done: number; weight: number | null; actualReps: number | null }[];
  }[],
) {
  let totalSetsDone = 0;
  let totalVolume = 0;
  for (const ex of loggedExercises) {
    for (const set of ex.loggedSets) {
      if (set.done === 1) {
        totalSetsDone++;
        if (set.weight != null && set.actualReps != null) {
          totalVolume += set.weight * set.actualReps;
        }
      }
    }
  }
  return { totalSetsDone, totalVolume };
}

async function fetchSessionWithChildren(id: string, userId: string) {
  return db.query.sessions.findFirst({
    where: and(eq(sessions.id, id), eq(sessions.userId, userId), isNull(sessions.deletedAt)),
    with: {
      loggedExercises: {
        orderBy: loggedExercises.order,
        with: {
          loggedSets: {
            orderBy: loggedSets.order,
          },
        },
      },
    },
  });
}

async function insertLoggedExercisesAndSets(
  sessionId: string,
  userId: string,
  exerciseInputs: z.infer<typeof createSessionInput>["exercises"],
) {
  for (let i = 0; i < exerciseInputs.length; i++) {
    const ex = exerciseInputs[i]!;
    const [inserted] = await db
      .insert(loggedExercises)
      .values({ sessionId, userId, exerciseId: ex.exerciseId, name: ex.name, order: i })
      .returning();
    for (let j = 0; j < ex.sets.length; j++) {
      const s = ex.sets[j]!;
      await db.insert(loggedSets).values({
        loggedExerciseId: inserted!.id,
        userId,
        weight: s.weight ?? null,
        targetReps: s.targetReps ?? null,
        actualReps: s.actualReps ?? null,
        done: s.done ? 1 : 0,
        order: j,
      });
    }
  }
}

export const sessionRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.query.sessions.findMany({
      where: and(eq(sessions.userId, ctx.userId), isNull(sessions.deletedAt)),
      orderBy: [desc(sessions.finishedAt), desc(sessions.id)],
      with: {
        loggedExercises: {
          orderBy: loggedExercises.order,
          with: {
            loggedSets: {
              orderBy: loggedSets.order,
            },
          },
        },
      },
    });
    return rows.map((session) => ({
      ...session,
      ...computeSessionStats(session.loggedExercises),
    }));
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const session = await fetchSessionWithChildren(input.id, ctx.userId);
    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
    }
    return { ...session, ...computeSessionStats(session.loggedExercises) };
  }),

  create: protectedProcedure.input(createSessionInput).mutation(async ({ input, ctx }) => {
    const [inserted] = await db
      .insert(sessions)
      .values({
        userId: ctx.userId,
        workoutId: input.workoutId,
        workoutTitle: input.workoutTitle,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        durationSeconds: input.durationSeconds,
      })
      .returning();
    await insertLoggedExercisesAndSets(inserted!.id, ctx.userId, input.exercises);
    const session = await fetchSessionWithChildren(inserted!.id, ctx.userId);
    return { ...session!, ...computeSessionStats(session!.loggedExercises) };
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, input.id),
          eq(sessions.userId, ctx.userId),
          isNull(sessions.deletedAt),
        ),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      await db.update(sessions).set({ deletedAt: new Date() }).where(eq(sessions.id, input.id));
      return { success: true };
    }),
});
