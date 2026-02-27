import { fireEvent, render, screen } from "@testing-library/react-native";

import { NumpadModal } from "../numpad-modal";

const baseProps = {
  visible: true,
  mode: "weight" as const,
  initialValue: "",
  label: "Bench Press — Set 1",
  onConfirm: jest.fn(),
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NumpadModal", () => {
  it("renders key grid and label when visible", () => {
    render(<NumpadModal {...baseProps} />);
    expect(screen.getByText("Bench Press — Set 1")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("does not render content when not visible", () => {
    render(<NumpadModal {...baseProps} visible={false} />);
    expect(screen.queryByText("1")).toBeNull();
  });

  it("pressing digits updates display", () => {
    render(<NumpadModal {...baseProps} />);
    fireEvent.press(screen.getByText("1"));
    fireEvent.press(screen.getByText("3"));
    fireEvent.press(screen.getByText("5"));
    expect(screen.getByTestId("numpad-display")).toHaveTextContent("135");
  });

  it("confirm calls onConfirm with value", () => {
    render(<NumpadModal {...baseProps} />);
    fireEvent.press(screen.getByText("1"));
    fireEvent.press(screen.getByText("3"));
    fireEvent.press(screen.getByText("5"));
    fireEvent.press(screen.getByText("Confirm"));
    expect(baseProps.onConfirm).toHaveBeenCalledWith("135");
  });

  it("confirm is no-op when display is empty", () => {
    render(<NumpadModal {...baseProps} />);
    fireEvent.press(screen.getByText("Confirm"));
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it("close button calls onClose", () => {
    render(<NumpadModal {...baseProps} />);
    fireEvent.press(screen.getByTestId("numpad-close"));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("hides decimal key in reps mode", () => {
    render(<NumpadModal {...baseProps} mode="reps" />);
    expect(screen.queryByText(".")).toBeNull();
  });

  it("shows decimal key in weight mode", () => {
    render(<NumpadModal {...baseProps} mode="weight" />);
    expect(screen.getByText(".")).toBeTruthy();
  });

  it("initializes display with initialValue", () => {
    render(<NumpadModal {...baseProps} initialValue="100" />);
    expect(screen.getByTestId("numpad-display")).toHaveTextContent("100");
  });

  it("backspace removes last digit", () => {
    render(<NumpadModal {...baseProps} initialValue="135" />);
    fireEvent.press(screen.getByTestId("numpad-backspace"));
    expect(screen.getByTestId("numpad-display")).toHaveTextContent("13");
  });
});
