import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout and therefore nothing to scroll.
Element.prototype.scrollIntoView = () => undefined;

afterEach(() => {
  cleanup();
});
