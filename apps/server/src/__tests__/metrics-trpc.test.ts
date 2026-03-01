import { env } from "cloudflare:workers";
import { describe, it, expect, beforeAll } from "vitest";
import app from "../index";
import { createMetricTables } from "./helpers/setup-db";
import { createAuthTables, signUpTestUser, getSessionCookie } from "./helpers/setup-auth";

let cookie: string;

beforeAll(async () => {
  await createAuthTables();
  await createMetricTables();
  const { res } = await signUpTestUser({ email: "metrics@test.com", password: "password123" });
  cookie = getSessionCookie(res)!;
});

async function trpcQuery(
  path: string,
  input?: unknown,
  cookieOverride?: string,
): Promise<{ status: number; json: any }> {
  const url = input
    ? `/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `/trpc/${path}`;
  const headers: Record<string, string> = {};
  const c = cookieOverride !== undefined ? cookieOverride : cookie;
  if (c) headers["Cookie"] = c;
  const res = await app.request(url, { headers });
  return { status: res.status, json: await res.json() };
}

async function trpcMutation(
  path: string,
  input: unknown,
  cookieOverride?: string,
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const c = cookieOverride !== undefined ? cookieOverride : cookie;
  if (c) headers["Cookie"] = c;
  const res = await app.request("/trpc/" + path, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return { status: res.status, json: await res.json() };
}

describe("metrics.listDefinitions", () => {
  it("returns empty array initially", async () => {
    const { status, json } = await trpcQuery("metrics.listDefinitions");
    expect(status).toBe(200);
    expect(json.result.data).toEqual([]);
  });

  it("returns only the current user's definitions", async () => {
    // User A creates definitions
    await trpcMutation("metrics.upsertDefinition", { name: "Weight", unit: "kg" });
    await trpcMutation("metrics.upsertDefinition", { name: "Body Fat", unit: "%" });

    // User A lists → sees both
    const { json: listA } = await trpcQuery("metrics.listDefinitions");
    const namesA = listA.result.data.map((d: { name: string }) => d.name);
    expect(namesA).toContain("Weight");
    expect(namesA).toContain("Body Fat");

    // User B lists → empty
    const { res: resB } = await signUpTestUser({
      email: "metricsB@test.com",
      password: "password123",
    });
    const cookieB = getSessionCookie(resB)!;
    const { json: listB } = await trpcQuery("metrics.listDefinitions", undefined, cookieB);
    expect(listB.result.data).toEqual([]);
  });

  it("unauthenticated request returns 401", async () => {
    const { status } = await trpcQuery("metrics.listDefinitions", undefined, "");
    expect(status).toBe(401);
  });
});

describe("metrics.upsertDefinition", () => {
  it("creates a definition when no id provided", async () => {
    const { status, json } = await trpcMutation("metrics.upsertDefinition", {
      name: "Water Intake",
      unit: "L",
    });
    expect(status).toBe(200);
    const def = json.result.data;
    expect(def.name).toBe("Water Intake");
    expect(def.unit).toBe("L");
    expect(def.id).toMatch(/^[0-9a-f]{8}-/i);
  });

  it("updates a definition when id provided", async () => {
    const { json: createJson } = await trpcMutation("metrics.upsertDefinition", {
      name: "Old Name",
      unit: "kg",
    });
    const id = createJson.result.data.id;

    const { status, json } = await trpcMutation("metrics.upsertDefinition", {
      id,
      name: "New Name",
      unit: "lbs",
    });
    expect(status).toBe(200);
    expect(json.result.data.name).toBe("New Name");
    expect(json.result.data.unit).toBe("lbs");
  });

  it("returns 404 when updating non-existent id", async () => {
    const { status } = await trpcMutation("metrics.upsertDefinition", {
      id: "non-existent-id",
      name: "Nope",
      unit: "x",
    });
    expect(status).toBe(404);
  });

  it("rejects blank name", async () => {
    const { status } = await trpcMutation("metrics.upsertDefinition", {
      name: "   ",
      unit: "kg",
    });
    expect(status).toBe(400);
  });
});

describe("metrics.deleteDefinition", () => {
  it("soft-deletes a definition and excludes from list", async () => {
    // Create a fresh user for isolation
    const { res: resF } = await signUpTestUser({
      email: "metrics-del@test.com",
      password: "password123",
    });
    const cookieF = getSessionCookie(resF)!;

    // Create two definitions
    await trpcMutation("metrics.upsertDefinition", { name: "Keep Me", unit: "kg" }, cookieF);
    const { json: c2 } = await trpcMutation(
      "metrics.upsertDefinition",
      { name: "Delete Me", unit: "%" },
      cookieF,
    );
    const deleteId = c2.result.data.id;

    // Delete one
    const { status, json } = await trpcMutation(
      "metrics.deleteDefinition",
      { id: deleteId },
      cookieF,
    );
    expect(status).toBe(200);
    expect(json.result.data.success).toBe(true);

    // List should exclude deleted
    const { json: listJson } = await trpcQuery("metrics.listDefinitions", undefined, cookieF);
    const names = listJson.result.data.map((d: { name: string }) => d.name);
    expect(names).toContain("Keep Me");
    expect(names).not.toContain("Delete Me");

    // DB row still exists with deletedAt set
    const row = await env.DB.prepare("SELECT id, deleted_at FROM metric_definitions WHERE id = ?")
      .bind(deleteId)
      .first();
    expect(row).not.toBeNull();
    expect(row!.deleted_at).not.toBeNull();
  });

  it("returns 404 for non-existent id", async () => {
    const { status } = await trpcMutation("metrics.deleteDefinition", { id: "non-existent-id" });
    expect(status).toBe(404);
  });
});

describe("metrics.listEntries", () => {
  it("returns entries for a metric, ordered by date desc", async () => {
    const { json: defJson } = await trpcMutation("metrics.upsertDefinition", {
      name: "ListTest",
      unit: "kg",
    });
    const defId = defJson.result.data.id;

    await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-01-01",
      value: 80,
    });
    await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-01-03",
      value: 79,
    });
    await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-01-02",
      value: 80.5,
    });

    const { status, json } = await trpcQuery("metrics.listEntries", { metricDefinitionId: defId });
    expect(status).toBe(200);
    const entries = json.result.data;
    expect(entries).toHaveLength(3);
    // ordered by date desc
    expect(entries[0].date).toBe("2025-01-03");
    expect(entries[1].date).toBe("2025-01-02");
    expect(entries[2].date).toBe("2025-01-01");
  });

  it("filters by startDate and endDate", async () => {
    const { json: defJson } = await trpcMutation("metrics.upsertDefinition", {
      name: "RangeTest",
      unit: "%",
    });
    const defId = defJson.result.data.id;

    await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-02-01",
      value: 15,
    });
    await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-02-15",
      value: 14.5,
    });
    await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-02-28",
      value: 14,
    });

    // Filter to middle range
    const { json } = await trpcQuery("metrics.listEntries", {
      metricDefinitionId: defId,
      startDate: "2025-02-10",
      endDate: "2025-02-20",
    });
    expect(json.result.data).toHaveLength(1);
    expect(json.result.data[0].date).toBe("2025-02-15");
  });
});

describe("metrics.upsertEntry", () => {
  it("creates an entry and returns it", async () => {
    const { json: defJson } = await trpcMutation("metrics.upsertDefinition", {
      name: "UpsertEntryTest",
      unit: "kg",
    });
    const defId = defJson.result.data.id;

    const { status, json } = await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-03-01",
      value: 75.5,
    });
    expect(status).toBe(200);
    const entry = json.result.data;
    expect(entry.metricDefinitionId).toBe(defId);
    expect(entry.date).toBe("2025-03-01");
    expect(entry.value).toBe(75.5);
    expect(entry.id).toMatch(/^[0-9a-f]{8}-/i);
  });

  it("upserts — same date+metric updates value, no duplicate", async () => {
    const { json: defJson } = await trpcMutation("metrics.upsertDefinition", {
      name: "UpsertDupTest",
      unit: "%",
    });
    const defId = defJson.result.data.id;

    // First insert
    await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-03-15",
      value: 20.0,
    });

    // Second insert same date+metric, different value
    const { status, json } = await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-03-15",
      value: 19.5,
    });
    expect(status).toBe(200);
    expect(json.result.data.value).toBe(19.5);

    // Only one entry should exist
    const { json: listJson } = await trpcQuery("metrics.listEntries", {
      metricDefinitionId: defId,
    });
    expect(listJson.result.data).toHaveLength(1);
    expect(listJson.result.data[0].value).toBe(19.5);
  });
});

describe("metrics.deleteEntry", () => {
  it("soft-deletes an entry and excludes from list", async () => {
    const { json: defJson } = await trpcMutation("metrics.upsertDefinition", {
      name: "DelEntryTest",
      unit: "kg",
    });
    const defId = defJson.result.data.id;

    const { json: e1 } = await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-04-01",
      value: 70,
    });
    await trpcMutation("metrics.upsertEntry", {
      metricDefinitionId: defId,
      date: "2025-04-02",
      value: 71,
    });

    const entryId = e1.result.data.id;

    // Delete entry
    const { status, json } = await trpcMutation("metrics.deleteEntry", { id: entryId });
    expect(status).toBe(200);
    expect(json.result.data.success).toBe(true);

    // listEntries excludes deleted
    const { json: listJson } = await trpcQuery("metrics.listEntries", {
      metricDefinitionId: defId,
    });
    expect(listJson.result.data).toHaveLength(1);
    expect(listJson.result.data[0].date).toBe("2025-04-02");

    // DB row still exists with deletedAt set
    const row = await env.DB.prepare("SELECT id, deleted_at FROM metric_entries WHERE id = ?")
      .bind(entryId)
      .first();
    expect(row).not.toBeNull();
    expect(row!.deleted_at).not.toBeNull();
  });

  it("returns 404 for non-existent id", async () => {
    const { status } = await trpcMutation("metrics.deleteEntry", { id: "non-existent-id" });
    expect(status).toBe(404);
  });
});
