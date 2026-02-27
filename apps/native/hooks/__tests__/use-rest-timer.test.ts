import { renderHook, act } from "@testing-library/react-native";

import { useRestTimer } from "../use-rest-timer";

describe("useRestTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts inactive", () => {
    const { result } = renderHook(() => useRestTimer());
    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("start begins countdown from 90", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => {
      result.current.start();
    });
    expect(result.current.isActive).toBe(true);
    expect(result.current.remaining).toBe(90);
  });

  it("counts down every second", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.remaining).toBe(87);
  });

  it("cancel stops the timer", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    act(() => {
      result.current.cancel();
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("auto-completes at 0 and calls onComplete", () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useRestTimer(onComplete));
    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(90_000);
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("dismiss stops the timer without calling onComplete", () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useRestTimer(onComplete));
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.isActive).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const { result, unmount } = renderHook(() => useRestTimer());
    act(() => {
      result.current.start();
    });
    unmount();
    jest.advanceTimersByTime(5000);
    // No error means cleanup happened
  });
});
