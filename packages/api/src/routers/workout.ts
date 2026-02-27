import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db, desc, eq } from "@ironlog/db";
import { exercises, setTemplates, workouts } from "@ironlog/db/schema";

import { publicProcedure, router } from "../index";

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

async function fetchWorkoutWithChildren(id: number) {
  return db.query.workouts.findFirst({
    where: eq(workouts.id, id),
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
  workoutId: number,
  exerciseInputs: z.infer<typeof createUpdateInput>["exercises"],
) {
  for (let i = 0; i < exerciseInputs.length; i++) {
    const ex = exerciseInputs[i]!;
    const [inserted] = await db
      .insert(exercises)
      .values({ workoutId, name: ex.name, order: i })
      .returning();
    for (let j = 0; j < ex.sets.length; j++) {
      const s = ex.sets[j]!;
      await db.insert(setTemplates).values({
        exerciseId: inserted!.id,
        weight: s.weight ?? null,
        targetReps: s.targetReps ?? null,
        order: j,
      });
    }
  }
}

export const workoutRouter = router({
  list: publicProcedure.query(async () => {
    return db.query.workouts.findMany({
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

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const workout = await fetchWorkoutWithChildren(input.id);
    if (!workout) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
    }
    return workout;
  }),

  create: publicProcedure.input(createUpdateInput).mutation(async ({ input }) => {
    const [inserted] = await db.insert(workouts).values({ title: input.title }).returning();
    await insertExercisesAndSets(inserted!.id, input.exercises);
    return fetchWorkoutWithChildren(inserted!.id);
  }),

  update: publicProcedure
    .input(createUpdateInput.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.workouts.findFirst({
        where: eq(workouts.id, input.id),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }
      await db.update(workouts).set({ title: input.title }).where(eq(workouts.id, input.id));
      // Delete old exercises (cascade deletes sets)
      await db.delete(exercises).where(eq(exercises.workoutId, input.id));
      await insertExercisesAndSets(input.id, input.exercises);
      return fetchWorkoutWithChildren(input.id);
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const existing = await db.query.workouts.findFirst({
      where: eq(workouts.id, input.id),
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
    }
    await db.delete(workouts).where(eq(workouts.id, input.id));
    return { success: true };
  }),
});
