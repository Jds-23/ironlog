import { describe, it, expect, beforeAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@ironlog/db";
import { metricDefinitions, metricEntries } from "@ironlog/db/schema";
import { createMetricTables } from "./helpers/setup-db";
import { createAuthTables, signUpTestUser } from "./helpers/setup-auth";

let userId: string;

beforeAll(async () => {
  await createAuthTables();
  await createMetricTables();
  const { json } = await signUpTestUser({
    email: "schema-metrics@test.com",
    password: "password123",
  });
  userId = json.user.id;
});

describe("metric_definitions schema", () => {
  it("insert & read definition", async () => {
    const [inserted] = await db
      .insert(metricDefinitions)
      .values({ userId, name: "Weight", unit: "kg" })
      .returning();

    const [row] = await db
      .select()
      .from(metricDefinitions)
      .where(eq(metricDefinitions.id, inserted!.id));

    expect(row!.id).toBe(inserted!.id);
    expect(row!.name).toBe("Weight");
    expect(row!.unit).toBe("kg");
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.deletedAt).toBeNull();
  });

  it("update definition name", async () => {
    const [inserted] = await db
      .insert(metricDefinitions)
      .values({ userId, name: "Body Fat", unit: "%" })
      .returning();

    await db
      .update(metricDefinitions)
      .set({ name: "Body Fat Percentage" })
      .where(eq(metricDefinitions.id, inserted!.id));

    const [row] = await db
      .select()
      .from(metricDefinitions)
      .where(eq(metricDefinitions.id, inserted!.id));

    expect(row!.name).toBe("Body Fat Percentage");
  });
});

describe("metric_entries schema", () => {
  it("insert & read entries filtered by metricDefinitionId", async () => {
    const [def1] = await db
      .insert(metricDefinitions)
      .values({ userId, name: "Weight", unit: "kg" })
      .returning();
    const [def2] = await db
      .insert(metricDefinitions)
      .values({ userId, name: "Body Fat", unit: "%" })
      .returning();

    await db.insert(metricEntries).values([
      { userId, metricDefinitionId: def1!.id, date: "2025-01-01", value: 80.5 },
      { userId, metricDefinitionId: def1!.id, date: "2025-01-02", value: 80.2 },
      { userId, metricDefinitionId: def2!.id, date: "2025-01-01", value: 15.3 },
    ]);

    const rows = await db
      .select()
      .from(metricEntries)
      .where(eq(metricEntries.metricDefinitionId, def1!.id));

    expect(rows).toHaveLength(2);
    expect(rows[0]!.value).toBe(80.5);
    expect(rows[1]!.value).toBe(80.2);
  });

  it("cascade delete definition removes entries", async () => {
    const [def] = await db
      .insert(metricDefinitions)
      .values({ userId, name: "Water", unit: "L" })
      .returning();

    await db.insert(metricEntries).values({
      userId,
      metricDefinitionId: def!.id,
      date: "2025-01-01",
      value: 2.5,
    });

    await db.delete(metricDefinitions).where(eq(metricDefinitions.id, def!.id));

    const remaining = await db
      .select()
      .from(metricEntries)
      .where(eq(metricEntries.metricDefinitionId, def!.id));

    expect(remaining).toHaveLength(0);
  });

  it("upsert — second insert same date+metric updates value, no duplicate", async () => {
    const [def] = await db
      .insert(metricDefinitions)
      .values({ userId, name: "Muscle Mass", unit: "%" })
      .returning();

    // First insert
    await db
      .insert(metricEntries)
      .values({ userId, metricDefinitionId: def!.id, date: "2025-03-01", value: 40.0 })
      .onConflictDoUpdate({
        target: [metricEntries.metricDefinitionId, metricEntries.date],
        set: {
          value: sql`excluded.value`,
          updatedAt: new Date(),
        },
      });

    // Second insert same date+metric, different value
    await db
      .insert(metricEntries)
      .values({ userId, metricDefinitionId: def!.id, date: "2025-03-01", value: 41.5 })
      .onConflictDoUpdate({
        target: [metricEntries.metricDefinitionId, metricEntries.date],
        set: {
          value: sql`excluded.value`,
          updatedAt: new Date(),
        },
      });

    const rows = await db
      .select()
      .from(metricEntries)
      .where(eq(metricEntries.metricDefinitionId, def!.id));

    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe(41.5);
  });
});
