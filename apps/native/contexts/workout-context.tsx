import React, { createContext, useContext, useReducer } from "react";

// --- Types ---

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

export type WorkoutState = {
  workouts: Workout[];
  sessions: Session[];
  activeWorkoutId: number | null;
};

// --- Actions ---

type AddWorkoutAction = {
  type: "ADD_WORKOUT";
  payload: { title: string; exercises: Exercise[] };
};

type UpdateWorkoutAction = {
  type: "UPDATE_WORKOUT";
  payload: { id: number; title: string; exercises: Exercise[] };
};

type DeleteWorkoutAction = {
  type: "DELETE_WORKOUT";
  payload: { id: number };
};

type SetActiveWorkoutAction = {
  type: "SET_ACTIVE_WORKOUT";
  payload: { id: number };
};

type ClearActiveWorkoutAction = {
  type: "CLEAR_ACTIVE_WORKOUT";
};

type AddSessionAction = {
  type: "ADD_SESSION";
  payload: Session;
};

export type WorkoutAction =
  | AddWorkoutAction
  | UpdateWorkoutAction
  | DeleteWorkoutAction
  | SetActiveWorkoutAction
  | ClearActiveWorkoutAction
  | AddSessionAction;

// --- Reducer ---

const initialState: WorkoutState = {
  workouts: [],
  sessions: [],
  activeWorkoutId: null,
};

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case "ADD_WORKOUT": {
      const id = Date.now();
      const workout: Workout = {
        id,
        title: action.payload.title,
        createdAt: id,
        exercises: action.payload.exercises,
      };
      return { ...state, workouts: [...state.workouts, workout] };
    }
    case "UPDATE_WORKOUT": {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        workouts: state.workouts.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      };
    }
    case "DELETE_WORKOUT": {
      if (state.activeWorkoutId === action.payload.id) return state;
      return {
        ...state,
        workouts: state.workouts.filter((w) => w.id !== action.payload.id),
      };
    }
    case "SET_ACTIVE_WORKOUT":
      return { ...state, activeWorkoutId: action.payload.id };
    case "CLEAR_ACTIVE_WORKOUT":
      return { ...state, activeWorkoutId: null };
    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, action.payload] };
  }
}

// --- Selectors ---

export function getWorkoutById(state: WorkoutState, id: number) {
  return state.workouts.find((w) => w.id === id);
}

export function getSessionById(state: WorkoutState, id: number) {
  return state.sessions.find((s) => s.id === id);
}

export function getAllSessions(state: WorkoutState) {
  return [...state.sessions].sort((a, b) => b.startedAt - a.startedAt);
}

export function getUniqueExercises(state: WorkoutState) {
  const names = new Set<string>();
  for (const w of state.workouts) {
    for (const e of w.exercises) {
      names.add(e.name);
    }
  }
  return [...names].sort();
}

export function isWorkoutActive(state: WorkoutState, id: number) {
  return state.activeWorkoutId === id;
}

// --- Context ---

type WorkoutContextType = {
  state: WorkoutState;
  dispatch: React.Dispatch<WorkoutAction>;
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);

  return <WorkoutContext.Provider value={{ state, dispatch }}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within WorkoutProvider");
  }
  return context;
}
