import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionSurface } from './ReactionSurface';

const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => motionPreference.reduced,
}));

beforeEach(() => {
  motionPreference.reduced = false;
});

const shine = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]');

describe('ReactionSurface', () => {
  it('lets a shine sweep over a correct answer', () => {
    const { container } = render(<ReactionSurface reaction="success">Antwort</ReactionSurface>);

    expect(shine(container)).toBeInTheDocument();
  });

  it('shows no shine for a wrong answer', () => {
    const { container } = render(<ReactionSurface reaction="error">Antwort</ReactionSurface>);

    expect(shine(container)).not.toBeInTheDocument();
  });

  it('keeps still for users who prefer reduced motion', () => {
    motionPreference.reduced = true;

    const { container } = render(<ReactionSurface reaction="success">Antwort</ReactionSurface>);

    expect(shine(container)).not.toBeInTheDocument();
    expect(container).toHaveTextContent('Antwort');
  });
});
