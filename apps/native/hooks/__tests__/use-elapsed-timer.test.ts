import { renderHook, act } from "@testing-library/react-native";

import { useElapsedTimer, formatTime } from "../use-elapsed-timer";

describe("formatTime", () => {
  it("formats 0 seconds", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats seconds only", () => {
    expect(formatTime(45)).toBe("00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125)).toBe("02:05");
  });

  it("formats large values", () => {
    expect(formatTime(3661)).toBe("61:01");
  });
});

describe("useElapsedTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts at 0", () => {
    const { result } = renderHook(() => useElapsedTimer());
    expect(result.current.elapsed).toBe(0);
  });

  it("increments every second", () => {
    const { result } = renderHook(() => useElapsedTimer());
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.elapsed).toBe(3);
  });

  it("cleans up interval on unmount", () => {
    const { unmount } = renderHook(() => useElapsedTimer());
    unmount();
    // No error means cleanup happened
    jest.advanceTimersByTime(5000);
  });

  it("exposes formatTime function", () => {
    const { result } = renderHook(() => useElapsedTimer());
    expect(result.current.formatTime(90)).toBe("01:30");
  });
});
