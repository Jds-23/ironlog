import type { LoggedExercise, LoggedSet, Session } from "@/types/workout";

type ServerLoggedSet = {
  id: number;
  loggedExerciseId: number;
  weight: number | null;
  targetReps: number | null;
  actualReps: number | null;
  done: number;
  order: number;
};

type ServerLoggedExercise = {
  id: number;
  sessionId: number;
  exerciseId: number;
  name: string;
  order: number;
  loggedSets: ServerLoggedSet[];
};

export type ServerSession = {
  id: number;
  workoutId: number;
  workoutTitle: string;
  startedAt: number;
  finishedAt: number;
  durationSeconds: number;
  loggedExercises: ServerLoggedExercise[];
};

export type ServerListSession = ServerSession & {
  totalSetsDone: number;
  totalVolume: number;
};

export function mapServerSession(server: ServerSession): Session {
  return {
    id: server.id,
    workoutId: server.workoutId,
    workoutTitle: server.workoutTitle,
    startedAt: server.startedAt,
    finishedAt: server.finishedAt,
    durationSeconds: server.durationSeconds,
    exercises: server.loggedExercises.map(
      (ex): LoggedExercise => ({
        id: ex.id,
        sessionId: ex.sessionId,
        exerciseId: ex.exerciseId,
        name: ex.name,
        order: ex.order,
        sets: ex.loggedSets.map(
          (s): LoggedSet => ({
            id: s.id,
            loggedExerciseId: s.loggedExerciseId,
            weight: s.weight,
            targetReps: s.targetReps,
            actualReps: s.actualReps,
            done: s.done === 1,
            order: s.order,
          }),
        ),
      }),
    ),
  };
}

export type MappedListSession = Session & {
  totalSetsDone: number;
  totalVolume: number;
};

export function mapServerListSession(server: ServerListSession): MappedListSession {
  return {
    ...mapServerSession(server),
    totalSetsDone: server.totalSetsDone,
    totalVolume: server.totalVolume,
  };
}
