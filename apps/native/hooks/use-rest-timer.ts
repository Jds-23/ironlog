import { useCallback, useEffect, useRef, useState } from "react";

const REST_SECONDS = 90;

export function useRestTimer(onComplete?: () => void) {
  const [isActive, setIsActive] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    setIsActive(true);
    setRemaining(REST_SECONDS);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsActive(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setRemaining(0);
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setRemaining(0);
  }, [clearTimer]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { isActive, remaining, start, cancel, dismiss };
}
