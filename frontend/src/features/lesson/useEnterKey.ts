import { useEffect, useRef } from 'react';

/**
 * Enter checks and continues from anywhere on the lesson screen. The handler returns whether it
 * used the key; only then the key's default (a click on a focused button) is suppressed, so the
 * key never acts twice.
 */
export function useEnterKey(enabled: boolean, handler: () => boolean): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.isComposing) return;
      if (latest.current()) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [enabled]);
}
