import { useEffect, useRef, type RefObject } from 'react';

/** Moves the focus without scrolling, so the screen stays where the learner left it. */
export function focusInPlace(element: HTMLElement | null | undefined): void {
  element?.focus({ preventScroll: true });
}

/**
 * Focuses the returned element (give it `tabIndex={-1}`) once it mounts: a screen that replaces
 * another in place takes the focus of the button that left, so the keyboard and screen readers
 * start at its heading instead of falling back to the top of the page.
 */
export function useFocusOnMount<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => focusInPlace(ref.current), []);
  return ref;
}
