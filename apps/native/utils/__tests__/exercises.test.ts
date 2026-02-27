import { EXERCISES, filterExercises, highlightMatch } from "../exercises";

describe("EXERCISES", () => {
  it("has exactly 49 entries", () => {
    expect(EXERCISES).toHaveLength(49);
  });

  it("contains only strings", () => {
    for (const name of EXERCISES) {
      expect(typeof name).toBe("string");
    }
  });
});

describe("filterExercises", () => {
  it("returns [] for empty string", () => {
    expect(filterExercises("")).toEqual([]);
  });

  it("returns [] for whitespace-only", () => {
    expect(filterExercises("   ")).toEqual([]);
    expect(filterExercises("  \t ")).toEqual([]);
  });

  it("matches substring case-insensitively for 'bench'", () => {
    const results = filterExercises("bench");
    expect(results).toEqual(["Bench Press", "Incline Bench Press", "Decline Bench Press"]);
  });

  it("matches substring case-insensitively for 'CuRl'", () => {
    const results = filterExercises("CuRl");
    expect(results).toEqual([
      "Leg Curl",
      "Bicep Curl",
      "Hammer Curl",
      "Preacher Curl",
      "Incline Dumbbell Curl",
    ]);
  });
});

describe("highlightMatch", () => {
  it("highlights match at the start", () => {
    expect(highlightMatch("Bench Press", "bench")).toEqual({
      before: "",
      match: "Bench",
      after: " Press",
    });
  });

  it("highlights match in the middle", () => {
    expect(highlightMatch("Incline Bench Press", "bench")).toEqual({
      before: "Incline ",
      match: "Bench",
      after: " Press",
    });
  });

  it("returns full name as before when no match", () => {
    expect(highlightMatch("Deadlift", "xyz")).toEqual({
      before: "Deadlift",
      match: "",
      after: "",
    });
  });
});
