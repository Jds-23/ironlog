import { useCallback, useMemo, useRef, useState } from "react";

import type { LoggedExercise, LoggedSet, Session, Workout } from "@/contexts/workout-context";

type LogSet = {
  weight: number | null;
  targetReps: number | null;
  actualReps: number | null;
  done: boolean;
};

type LogExercise = {
  name: string;
  exerciseId: number;
  sets: LogSet[];
};

export type NextUndoneSet = {
  exIdx: number;
  setIdx: number;
  exerciseName: string;
  setNumber: number;
  weight: number | null;
};

function cloneExercises(workout: Workout): LogExercise[] {
  return workout.exercises.map((ex) => ({
    name: ex.name,
    exerciseId: ex.id,
    sets: ex.sets.map((s) => ({
      weight: s.weight,
      targetReps: s.targetReps,
      actualReps: s.targetReps,
      done: false,
    })),
  }));
}

export function useLogSession(workout: Workout) {
  const [logExercises, setLogExercises] = useState<LogExercise[]>(() => cloneExercises(workout));
  const doneRef = useRef(false);

  const updateWeight = useCallback((exIdx: number, setIdx: number, value: number | null) => {
    setLogExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIdx
          ? { ...ex, sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, weight: value } : s)) }
          : ex,
      ),
    );
  }, []);

  const updateReps = useCallback((exIdx: number, setIdx: number, value: number | null) => {
    setLogExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, actualReps: value } : s)),
            }
          : ex,
      ),
    );
  }, []);

  const toggleDone = useCallback((exIdx: number, setIdx: number): boolean => {
    let newDone = false;
    setLogExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, si) => {
                if (si === setIdx) {
                  newDone = !s.done;
                  return { ...s, done: newDone };
                }
                return s;
              }),
            }
          : ex,
      ),
    );
    doneRef.current = newDone;
    return newDone;
  }, []);

  const nextUndoneSet = useMemo((): NextUndoneSet | null => {
    for (let ei = 0; ei < logExercises.length; ei++) {
      const ex = logExercises[ei];
      for (let si = 0; si < ex.sets.length; si++) {
        if (!ex.sets[si].done) {
          return {
            exIdx: ei,
            setIdx: si,
            exerciseName: ex.name,
            setNumber: si + 1,
            weight: ex.sets[si].weight,
          };
        }
      }
    }
    return null;
  }, [logExercises]);

  const progress = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const ex of logExercises) {
      for (const s of ex.sets) {
        total++;
        if (s.done) done++;
      }
    }
    return { done, total };
  }, [logExercises]);

  const allDone = progress.done === progress.total && progress.total > 0;

  const buildSession = useCallback(
    (startedAt: number): Session => {
      const now = Date.now();
      const baseId = now;
      const exercises: LoggedExercise[] = logExercises.map((ex, ei) => ({
        id: baseId + ei + 1,
        sessionId: baseId,
        exerciseId: ex.exerciseId,
        name: ex.name,
        order: ei,
        sets: ex.sets.map(
          (s, si): LoggedSet => ({
            id: baseId + ei * 100 + si + 1000,
            loggedExerciseId: baseId + ei + 1,
            weight: s.weight,
            targetReps: s.targetReps,
            actualReps: s.actualReps,
            done: s.done,
            order: si,
          }),
        ),
      }));

      return {
        id: baseId,
        workoutId: workout.id,
        workoutTitle: workout.title,
        startedAt,
        finishedAt: now,
        durationSeconds: Math.round((now - startedAt) / 1000),
        exercises,
      };
    },
    [logExercises, workout.id, workout.title],
  );

  return {
    logExercises,
    updateWeight,
    updateReps,
    toggleDone,
    nextUndoneSet,
    progress,
    allDone,
    buildSession,
  };
}
