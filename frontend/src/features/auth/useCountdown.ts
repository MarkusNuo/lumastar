import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 250;

/** Whole seconds left until a deadline set with `start`; 0 when no countdown runs. */
export function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef(0);
  const running = remaining > 0;

  const start = useCallback((seconds: number) => {
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(Math.max(0, Math.ceil(seconds)));
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  return [remaining, start] as const;
}
