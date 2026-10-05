import { useEffect, useLayoutEffect, useRef } from 'react';

/** Runs `action` once, as soon as `ready` turns true; later renders never repeat it. */
export function useOnceWhen(ready: boolean, action: () => void): void {
  const done = useRef(false);
  const latest = useRef(action);

  useLayoutEffect(() => {
    latest.current = action;
  });

  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    latest.current();
  }, [ready]);
}
