import { fireEvent, render, screen } from "@testing-library/react-native";

import type { NextUndoneSet } from "@/hooks/use-log-session";

import { BottomBar } from "../bottom-bar";

const nextSet: NextUndoneSet = {
  exIdx: 0,
  setIdx: 1,
  exerciseName: "Bench Press",
  setNumber: 2,
  weight: 135,
};

const baseProps = {
  nextSet,
  elapsed: 125,
  formatTime: (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  },
  onLogReps: jest.fn(),
  onFinish: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BottomBar", () => {
  it("renders Up Next card when nextSet provided", () => {
    render(<BottomBar {...baseProps} />);
    expect(screen.getByText("UP NEXT")).toBeTruthy();
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText(/Set 2/)).toBeTruthy();
  });

  it("hides Up Next when nextSet is null", () => {
    render(<BottomBar {...baseProps} nextSet={null} />);
    expect(screen.queryByText("UP NEXT")).toBeNull();
    expect(screen.queryByText("Bench Press")).toBeNull();
  });

  it("Log Reps button calls onLogReps", () => {
    render(<BottomBar {...baseProps} />);
    fireEvent.press(screen.getByText("+ Log Reps"));
    expect(baseProps.onLogReps).toHaveBeenCalledTimes(1);
  });

  it("Finish button calls onFinish", () => {
    render(<BottomBar {...baseProps} />);
    fireEvent.press(screen.getByTestId("finish-btn"));
    expect(baseProps.onFinish).toHaveBeenCalledTimes(1);
  });

  it("Finish button shows elapsed time", () => {
    render(<BottomBar {...baseProps} />);
    expect(screen.getByTestId("finish-btn")).toHaveTextContent("Finish · 02:05");
  });
});
