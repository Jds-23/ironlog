import type { Exercise, SetTemplate, Workout } from "@/types/workout";

type ServerSetTemplate = {
  id: number;
  exerciseId: number;
  weight: number | null;
  targetReps: number | null;
  order: number;
};

type ServerExercise = {
  id: number;
  workoutId: number;
  name: string;
  order: number;
  setTemplates: ServerSetTemplate[];
};

export type ServerWorkout = {
  id: number;
  title: string;
  createdAt: string | Date;
  exercises: ServerExercise[];
};

export function mapServerWorkout(server: ServerWorkout): Workout {
  return {
    id: server.id,
    title: server.title,
    createdAt:
      typeof server.createdAt === "string"
        ? new Date(server.createdAt).getTime()
        : server.createdAt.getTime(),
    exercises: server.exercises.map(
      (ex): Exercise => ({
        id: ex.id,
        workoutId: ex.workoutId,
        name: ex.name,
        order: ex.order,
        sets: ex.setTemplates.map(
          (st): SetTemplate => ({
            id: st.id,
            exerciseId: st.exerciseId,
            weight: st.weight,
            targetReps: st.targetReps,
            order: st.order,
          }),
        ),
      }),
    ),
  };
}

export function mapClientExercisesToInput(
  exercises: Exercise[],
): { name: string; sets: { weight: number | null; targetReps: number | null }[] }[] {
  return exercises.map((ex) => ({
    name: ex.name,
    sets: ex.sets.map((s) => ({
      weight: s.weight,
      targetReps: s.targetReps,
    })),
  }));
}
