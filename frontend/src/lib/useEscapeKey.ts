import { useEffect, useRef } from 'react';

/** Calls `handler` on Escape while `enabled`, e.g. to ask before leaving a full-screen task. */
export function useEscapeKey(enabled: boolean, handler: () => void): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
