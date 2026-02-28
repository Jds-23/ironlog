import type { LoggedExercise, Session } from "@/types/workout";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatSessionDate(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} · ${hours}:${minutes}`;
}

export function calcTotalVolume(exercises: LoggedExercise[]): number {
  let total = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (set.weight != null && set.actualReps != null) {
        total += set.weight * set.actualReps;
      }
    }
  }
  return total;
}

export function calcCompletedSets(exercises: LoggedExercise[]): number {
  let count = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (set.done) count++;
    }
  }
  return count;
}

export function getSessionExerciseNames(sessions: Session[]): string[] {
  const names = new Set<string>();
  for (const session of sessions) {
    for (const ex of session.exercises) {
      names.add(ex.name);
    }
  }
  return [...names].sort();
}
