import { describe, expect, it } from "vitest";

import { upsertDefinitionInput, listEntriesInput, upsertEntryInput } from "../metrics";

describe("upsertDefinitionInput", () => {
  it("accepts valid create (no id)", () => {
    const result = upsertDefinitionInput.safeParse({ name: "Weight", unit: "kg" });
    expect(result.success).toBe(true);
  });

  it("accepts valid update (with id)", () => {
    const result = upsertDefinitionInput.safeParse({
      id: "abc-123",
      name: "Weight",
      unit: "lbs",
    });
    expect(result.success).toBe(true);
  });

  it("trims name whitespace", () => {
    const result = upsertDefinitionInput.safeParse({ name: "  Weight  ", unit: "kg" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Weight");
    }
  });

  it("rejects empty name", () => {
    const result = upsertDefinitionInput.safeParse({ name: "", unit: "kg" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    const result = upsertDefinitionInput.safeParse({ name: "   ", unit: "kg" });
    expect(result.success).toBe(false);
  });

  it("rejects empty unit", () => {
    const result = upsertDefinitionInput.safeParse({ name: "Weight", unit: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = upsertDefinitionInput.safeParse({ unit: "kg" });
    expect(result.success).toBe(false);
  });
});

describe("listEntriesInput", () => {
  it("accepts metricDefinitionId only", () => {
    const result = listEntriesInput.safeParse({ metricDefinitionId: "abc-123" });
    expect(result.success).toBe(true);
  });

  it("accepts with date range", () => {
    const result = listEntriesInput.safeParse({
      metricDefinitionId: "abc-123",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing metricDefinitionId", () => {
    const result = listEntriesInput.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("upsertEntryInput", () => {
  it("accepts valid entry", () => {
    const result = upsertEntryInput.safeParse({
      metricDefinitionId: "abc-123",
      date: "2025-03-01",
      value: 80.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = upsertEntryInput.safeParse({
      metricDefinitionId: "abc-123",
      date: "March 1, 2025",
      value: 80,
    });
    expect(result.success).toBe(false);
  });

  it("rejects string value", () => {
    const result = upsertEntryInput.safeParse({
      metricDefinitionId: "abc-123",
      date: "2025-03-01",
      value: "eighty",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing date", () => {
    const result = upsertEntryInput.safeParse({
      metricDefinitionId: "abc-123",
      value: 80,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing metricDefinitionId", () => {
    const result = upsertEntryInput.safeParse({
      date: "2025-03-01",
      value: 80,
    });
    expect(result.success).toBe(false);
  });
});
