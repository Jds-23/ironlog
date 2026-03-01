import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, db, desc, eq, isNull } from "@ironlog/db";
import { exercises, setTemplates, workouts } from "@ironlog/db/schema";

import { protectedProcedure, router } from "../index";

export const exerciseInput = z.object({
  name: z.string().min(1),
  sets: z.array(
    z.object({
      weight: z.number().nullable().optional(),
      targetReps: z.number().int().nullable().optional(),
    }),
  ),
});

export const createUpdateInput = z.object({
  title: z.string().trim().min(1),
  exercises: z.array(exerciseInput),
});

async function fetchWorkoutWithChildren(id: string, userId: string) {
  return db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, userId), isNull(workouts.deletedAt)),
    with: {
      exercises: {
        orderBy: exercises.order,
        with: {
          setTemplates: {
            orderBy: setTemplates.order,
          },
        },
      },
    },
  });
}

async function insertExercisesAndSets(
  workoutId: string,
  userId: string,
  exerciseInputs: z.infer<typeof createUpdateInput>["exercises"],
) {
  for (let i = 0; i < exerciseInputs.length; i++) {
    const ex = exerciseInputs[i]!;
    const [inserted] = await db
      .insert(exercises)
      .values({ workoutId, userId, name: ex.name, order: i })
      .returning();
    for (let j = 0; j < ex.sets.length; j++) {
      const s = ex.sets[j]!;
      await db.insert(setTemplates).values({
        exerciseId: inserted!.id,
        userId,
        weight: s.weight ?? null,
        targetReps: s.targetReps ?? null,
        order: j,
      });
    }
  }
}

export const workoutRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.query.workouts.findMany({
      where: and(eq(workouts.userId, ctx.userId), isNull(workouts.deletedAt)),
      orderBy: [desc(workouts.createdAt), desc(workouts.id)],
      with: {
        exercises: {
          orderBy: exercises.order,
          with: {
            setTemplates: {
              orderBy: setTemplates.order,
            },
          },
        },
      },
    });
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const workout = await fetchWorkoutWithChildren(input.id, ctx.userId);
    if (!workout) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
    }
    return workout;
  }),

  create: protectedProcedure.input(createUpdateInput).mutation(async ({ input, ctx }) => {
    const [inserted] = await db
      .insert(workouts)
      .values({ title: input.title, userId: ctx.userId })
      .returning();
    await insertExercisesAndSets(inserted!.id, ctx.userId, input.exercises);
    return fetchWorkoutWithChildren(inserted!.id, ctx.userId);
  }),

  update: protectedProcedure
    .input(createUpdateInput.extend({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.query.workouts.findFirst({
        where: and(
          eq(workouts.id, input.id),
          eq(workouts.userId, ctx.userId),
          isNull(workouts.deletedAt),
        ),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }
      await db.update(workouts).set({ title: input.title }).where(eq(workouts.id, input.id));
      // Delete old exercises (cascade deletes sets)
      await db.delete(exercises).where(eq(exercises.workoutId, input.id));
      await insertExercisesAndSets(input.id, ctx.userId, input.exercises);
      return fetchWorkoutWithChildren(input.id, ctx.userId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.query.workouts.findFirst({
        where: and(
          eq(workouts.id, input.id),
          eq(workouts.userId, ctx.userId),
          isNull(workouts.deletedAt),
        ),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }
      await db.update(workouts).set({ deletedAt: new Date() }).where(eq(workouts.id, input.id));
      return { success: true };
    }),
});
