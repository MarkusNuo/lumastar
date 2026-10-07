import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// The default second for findBy/waitFor is too short when the whole suite runs on a busy machine.
configure({ asyncUtilTimeout: 3000 });

// jsdom has no layout and therefore nothing to scroll.
Element.prototype.scrollIntoView = () => undefined;

// jsdom has no media queries either; like a browser tab, nothing matches (e.g. display-mode).
window.matchMedia = (media: string): MediaQueryList => ({
  matches: false,
  media,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
});

afterEach(() => {
  cleanup();
});
