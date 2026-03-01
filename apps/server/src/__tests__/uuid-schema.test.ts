import { describe, it, expect, beforeAll } from "vitest";
import { eq, isNull } from "drizzle-orm";
import { db } from "@ironlog/db";
import { workouts, exercises, setTemplates } from "@ironlog/db/schema";
import { sessions, loggedExercises, loggedSets } from "@ironlog/db/schema";
import { createSessionTables } from "./helpers/setup-db";
import { createAuthTables, signUpTestUser } from "./helpers/setup-auth";

let userId: string;

beforeAll(async () => {
  await createAuthTables();
  await createSessionTables();
  const { json } = await signUpTestUser({
    email: "uuid-schema@test.com",
    password: "password123",
  });
  userId = json.user.id;
});

describe("uuid schema migration", () => {
  it("phase 1: workouts use text UUID PK", async () => {
    const [inserted] = await db.insert(workouts).values({ title: "UUID Test", userId }).returning();

    expect(typeof inserted!.id).toBe("string");
    expect(inserted!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    const [row] = await db.select().from(workouts).where(eq(workouts.id, inserted!.id));
    expect(row!.id).toBe(inserted!.id);
    expect(row!.title).toBe("UUID Test");
  });

  it("phase 2: exercises + setTemplates use UUID PKs with cascade delete", async () => {
    const [w] = await db.insert(workouts).values({ title: "Cascade Test", userId }).returning();
    const [e] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Bench Press", order: 1, userId })
      .returning();
    const [st] = await db
      .insert(setTemplates)
      .values({ exerciseId: e!.id, weight: 100, targetReps: 10, order: 1, userId })
      .returning();

    expect(typeof e!.id).toBe("string");
    expect(typeof st!.id).toBe("string");
    expect(typeof e!.workoutId).toBe("string");
    expect(typeof st!.exerciseId).toBe("string");

    // cascade: delete workout removes exercises and setTemplates
    await db.delete(workouts).where(eq(workouts.id, w!.id));

    const remainingExercises = await db
      .select()
      .from(exercises)
      .where(eq(exercises.workoutId, w!.id));
    const remainingSets = await db
      .select()
      .from(setTemplates)
      .where(eq(setTemplates.exerciseId, e!.id));

    expect(remainingExercises).toHaveLength(0);
    expect(remainingSets).toHaveLength(0);
  });

  it("phase 3: sessions use text UUID PK with text FK to workouts", async () => {
    const [w] = await db.insert(workouts).values({ title: "Session Test", userId }).returning();
    const [inserted] = await db
      .insert(sessions)
      .values({
        userId,
        workoutId: w!.id,
        workoutTitle: "Session Test",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();

    expect(typeof inserted!.id).toBe("string");
    expect(inserted!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(typeof inserted!.workoutId).toBe("string");

    const [row] = await db.select().from(sessions).where(eq(sessions.id, inserted!.id));
    expect(row!.id).toBe(inserted!.id);
    expect(row!.workoutId).toBe(w!.id);
  });

  it("phase 4: loggedExercises + loggedSets use UUID PKs with cascade delete", async () => {
    const [w] = await db.insert(workouts).values({ title: "Logged Test", userId }).returning();
    const [s] = await db
      .insert(sessions)
      .values({
        userId,
        workoutId: w!.id,
        workoutTitle: "Logged Test",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: "fake-exercise-id", name: "Squat", order: 1, userId })
      .returning();
    const [ls] = await db
      .insert(loggedSets)
      .values({
        loggedExerciseId: le!.id,
        weight: 135,
        targetReps: 5,
        actualReps: 5,
        done: 1,
        order: 1,
        userId,
      })
      .returning();

    expect(typeof le!.id).toBe("string");
    expect(typeof ls!.id).toBe("string");
    expect(typeof le!.sessionId).toBe("string");
    expect(typeof le!.exerciseId).toBe("string");
    expect(typeof ls!.loggedExerciseId).toBe("string");

    // cascade: delete session removes loggedExercises and loggedSets
    await db.delete(sessions).where(eq(sessions.id, s!.id));

    const remainingLE = await db
      .select()
      .from(loggedExercises)
      .where(eq(loggedExercises.sessionId, s!.id));
    const remainingLS = await db
      .select()
      .from(loggedSets)
      .where(eq(loggedSets.loggedExerciseId, le!.id));

    expect(remainingLE).toHaveLength(0);
    expect(remainingLS).toHaveLength(0);
  });

  it("phase 5: userId required on exercises, setTemplates, loggedExercises, loggedSets", async () => {
    const [w] = await db.insert(workouts).values({ title: "UserId Test", userId }).returning();
    const [e] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Bench", order: 1, userId })
      .returning();
    const [st] = await db
      .insert(setTemplates)
      .values({ exerciseId: e!.id, weight: 100, targetReps: 10, order: 1, userId })
      .returning();

    const [s] = await db
      .insert(sessions)
      .values({
        userId,
        workoutId: w!.id,
        workoutTitle: "UserId Test",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: e!.id, name: "Bench", order: 1, userId })
      .returning();
    const [ls] = await db
      .insert(loggedSets)
      .values({ loggedExerciseId: le!.id, order: 1, userId })
      .returning();

    // verify userId is stored and queryable
    expect(e!.userId).toBe(userId);
    expect(st!.userId).toBe(userId);
    expect(le!.userId).toBe(userId);
    expect(ls!.userId).toBe(userId);

    const exercisesByUser = await db.select().from(exercises).where(eq(exercises.userId, userId));
    expect(exercisesByUser.length).toBeGreaterThanOrEqual(1);
  });

  it("phase 6: updatedAt defaults on insert", async () => {
    const before = Date.now();
    const [inserted] = await db
      .insert(workouts)
      .values({ title: "UpdatedAt Test", userId })
      .returning();
    const after = Date.now();

    expect(inserted!.updatedAt).toBeInstanceOf(Date);
    const ts = inserted!.updatedAt.getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("phase 7: deletedAt nullable + soft-delete filtering", async () => {
    const [w1] = await db.insert(workouts).values({ title: "Active Workout", userId }).returning();
    const [w2] = await db.insert(workouts).values({ title: "Deleted Workout", userId }).returning();

    // soft-delete w2
    await db.update(workouts).set({ deletedAt: new Date() }).where(eq(workouts.id, w2!.id));

    // query non-deleted only
    const active = await db.select().from(workouts).where(isNull(workouts.deletedAt));

    const activeIds = active.map((w) => w.id);
    expect(activeIds).toContain(w1!.id);
    expect(activeIds).not.toContain(w2!.id);
  });
});
