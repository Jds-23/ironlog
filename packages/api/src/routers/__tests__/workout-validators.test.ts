import { describe, expect, it } from "vitest";

import { createUpdateInput, exerciseInput } from "../workout";

describe("exerciseInput", () => {
  it("accepts valid exercise", () => {
    const result = exerciseInput.safeParse({
      name: "Bench Press",
      sets: [{ weight: 135, targetReps: 8 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = exerciseInput.safeParse({
      name: "",
      sets: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty sets array", () => {
    const result = exerciseInput.safeParse({
      name: "Squat",
      sets: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable weight and targetReps", () => {
    const result = exerciseInput.safeParse({
      name: "Deadlift",
      sets: [{ weight: null, targetReps: null }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts omitted weight and targetReps", () => {
    const result = exerciseInput.safeParse({
      name: "Pull-up",
      sets: [{}],
    });
    expect(result.success).toBe(true);
  });

  it("rejects string for weight", () => {
    const result = exerciseInput.safeParse({
      name: "Curl",
      sets: [{ weight: "heavy" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer targetReps", () => {
    const result = exerciseInput.safeParse({
      name: "Row",
      sets: [{ targetReps: 8.5 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("createUpdateInput", () => {
  it("accepts valid input", () => {
    const result = createUpdateInput.safeParse({
      title: "Push Day",
      exercises: [{ name: "Bench Press", sets: [{ weight: 135, targetReps: 8 }] }],
    });
    expect(result.success).toBe(true);
  });

  it("trims title whitespace", () => {
    const result = createUpdateInput.safeParse({
      title: "  Push Day  ",
      exercises: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Push Day");
    }
  });

  it("rejects empty title", () => {
    const result = createUpdateInput.safeParse({
      title: "",
      exercises: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only title", () => {
    const result = createUpdateInput.safeParse({
      title: "   ",
      exercises: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty exercises array", () => {
    const result = createUpdateInput.safeParse({
      title: "Rest Day",
      exercises: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = createUpdateInput.safeParse({
      exercises: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid exercise within array", () => {
    const result = createUpdateInput.safeParse({
      title: "Leg Day",
      exercises: [{ name: "", sets: [] }],
    });
    expect(result.success).toBe(false);
  });
});
