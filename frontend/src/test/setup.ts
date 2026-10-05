import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// The default second for findBy/waitFor is too short when the whole suite runs on a busy machine.
configure({ asyncUtilTimeout: 3000 });

// jsdom has no layout and therefore nothing to scroll.
Element.prototype.scrollIntoView = () => undefined;

afterEach(() => {
  cleanup();
});
