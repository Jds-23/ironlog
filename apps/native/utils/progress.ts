import type { Session } from "@/contexts/workout-context";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function exerciseVolume(session: Session, exerciseName: string): number {
  let total = 0;
  for (const ex of session.exercises) {
    if (ex.name !== exerciseName) continue;
    for (const set of ex.sets) {
      if (set.weight != null && set.actualReps != null) {
        total += set.weight * set.actualReps;
      }
    }
  }
  return total;
}

function exerciseMaxWeight(session: Session, exerciseName: string): number {
  let max = 0;
  for (const ex of session.exercises) {
    if (ex.name !== exerciseName) continue;
    for (const set of ex.sets) {
      if (set.weight != null && set.weight > max) {
        max = set.weight;
      }
    }
  }
  return max;
}

function hasExercise(session: Session, exerciseName: string): boolean {
  return session.exercises.some((ex) => ex.name === exerciseName);
}

export function getVolumeOverTime(
  sessions: Session[],
  exerciseName: string,
): { date: string; volume: number }[] {
  const result: { date: string; volume: number }[] = [];
  for (const session of sessions) {
    if (!hasExercise(session, exerciseName)) continue;
    result.push({
      date: shortDate(session.startedAt),
      volume: exerciseVolume(session, exerciseName),
    });
  }
  return result;
}

export function getMaxWeightOverTime(
  sessions: Session[],
  exerciseName: string,
): { date: string; weight: number }[] {
  const result: { date: string; weight: number }[] = [];
  for (const session of sessions) {
    if (!hasExercise(session, exerciseName)) continue;
    result.push({
      date: shortDate(session.startedAt),
      weight: exerciseMaxWeight(session, exerciseName),
    });
  }
  return result;
}

export function getExerciseStats(
  sessions: Session[],
  exerciseName: string,
): { personalBest: number; lastSessionVolume: number; sessionsLogged: number } {
  let personalBest = 0;
  let lastSessionVolume = 0;
  let sessionsLogged = 0;

  for (const session of sessions) {
    if (!hasExercise(session, exerciseName)) continue;
    sessionsLogged++;
    const maxW = exerciseMaxWeight(session, exerciseName);
    if (maxW > personalBest) personalBest = maxW;
    lastSessionVolume = exerciseVolume(session, exerciseName);
  }

  return { personalBest, lastSessionVolume, sessionsLogged };
}
