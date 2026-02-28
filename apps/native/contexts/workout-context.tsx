import React, { createContext, useContext, useReducer } from "react";

export type WorkoutState = {
  activeWorkoutId: number | null;
};

type SetActiveWorkoutAction = {
  type: "SET_ACTIVE_WORKOUT";
  payload: { id: number };
};

type ClearActiveWorkoutAction = {
  type: "CLEAR_ACTIVE_WORKOUT";
};

export type WorkoutAction = SetActiveWorkoutAction | ClearActiveWorkoutAction;

const initialState: WorkoutState = {
  activeWorkoutId: null,
};

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case "SET_ACTIVE_WORKOUT":
      return { ...state, activeWorkoutId: action.payload.id };
    case "CLEAR_ACTIVE_WORKOUT":
      return { ...state, activeWorkoutId: null };
  }
}

export function isWorkoutActive(state: WorkoutState, id: number) {
  return state.activeWorkoutId === id;
}

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
