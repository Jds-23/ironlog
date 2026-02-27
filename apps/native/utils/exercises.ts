export const EXERCISES: string[] = [
  "Bench Press",
  "Incline Bench Press",
  "Decline Bench Press",
  "Chest Fly",
  "Cable Crossover",
  "Push Up",
  "Dips",
  "Squat",
  "Front Squat",
  "Leg Press",
  "Leg Extension",
  "Leg Curl",
  "Romanian Deadlift",
  "Deadlift",
  "Sumo Deadlift",
  "Hip Thrust",
  "Calf Raise",
  "Pull Up",
  "Chin Up",
  "Lat Pulldown",
  "Seated Row",
  "Bent Over Row",
  "T-Bar Row",
  "Shoulder Press",
  "Arnold Press",
  "Lateral Raise",
  "Front Raise",
  "Face Pull",
  "Shrug",
  "Bicep Curl",
  "Hammer Curl",
  "Preacher Curl",
  "Tricep Pushdown",
  "Skull Crusher",
  "Overhead Tricep Extension",
  "Plank",
  "Crunch",
  "Leg Raise",
  "Russian Twist",
  "Cable Row",
  "Chest Supported Row",
  "Incline Dumbbell Curl",
  "Goblet Squat",
  "Bulgarian Split Squat",
  "Lunges",
  "Step Up",
  "Box Jump",
  "Battle Ropes",
  "Farmer Carry",
];

export function filterExercises(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed === "") return [];
  const lower = trimmed.toLowerCase();
  return EXERCISES.filter((name) => name.toLowerCase().includes(lower));
}

export function highlightMatch(
  name: string,
  query: string,
): { before: string; match: string; after: string } {
  const index = name.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return { before: name, match: "", after: "" };
  return {
    before: name.slice(0, index),
    match: name.slice(index, index + query.length),
    after: name.slice(index + query.length),
  };
}
