import { fireEvent, render, screen } from "@testing-library/react-native";

import { RestTimerBanner } from "../rest-timer";

const baseProps = {
  isActive: true,
  remaining: 75,
  totalSeconds: 90,
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RestTimerBanner", () => {
  it("renders when active", () => {
    render(<RestTimerBanner {...baseProps} />);
    expect(screen.getByText("REST")).toBeTruthy();
    expect(screen.getByTestId("rest-timer-countdown")).toBeTruthy();
  });

  it("does not render when inactive", () => {
    render(<RestTimerBanner {...baseProps} isActive={false} />);
    expect(screen.queryByText("REST")).toBeNull();
  });

  it("displays remaining time", () => {
    render(<RestTimerBanner {...baseProps} remaining={45} />);
    expect(screen.getByTestId("rest-timer-countdown")).toHaveTextContent("0:45");
  });

  it("dismiss button calls onDismiss", () => {
    render(<RestTimerBanner {...baseProps} />);
    fireEvent.press(screen.getByTestId("rest-timer-dismiss"));
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders progress bar", () => {
    render(<RestTimerBanner {...baseProps} />);
    expect(screen.getByTestId("rest-timer-progress")).toBeTruthy();
  });
});
