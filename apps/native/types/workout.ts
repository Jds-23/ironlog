export type SetTemplate = {
  id: number;
  exerciseId: number;
  weight: number | null;
  targetReps: number | null;
  order: number;
};

export type Exercise = {
  id: number;
  workoutId: number;
  name: string;
  order: number;
  sets: SetTemplate[];
};

export type Workout = {
  id: number;
  title: string;
  createdAt: number;
  exercises: Exercise[];
};

export type LoggedSet = {
  id: number;
  loggedExerciseId: number;
  weight: number | null;
  targetReps: number | null;
  actualReps: number | null;
  done: boolean;
  order: number;
};

export type LoggedExercise = {
  id: number;
  sessionId: number;
  exerciseId: number;
  name: string;
  order: number;
  sets: LoggedSet[];
};

export type Session = {
  id: number;
  workoutId: number;
  workoutTitle: string;
  startedAt: number;
  finishedAt: number;
  durationSeconds: number;
  exercises: LoggedExercise[];
};
