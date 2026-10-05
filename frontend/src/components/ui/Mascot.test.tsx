import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Mascot } from './Mascot';

const motion = vi.hoisted(() => ({ reduced: false, animate: vi.fn() }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => motion.reduced,
  useAnimate: () => [{ current: null }, motion.animate],
}));

beforeEach(() => {
  motion.reduced = false;
  motion.animate.mockClear();
});

describe('Mascot', () => {
  it('describes its expression to screen readers', () => {
    render(<Mascot expression="encouraging" />);

    expect(screen.getByRole('img', { name: 'Maskottchen ermutigt dich' })).toBeInTheDocument();
  });

  it('stays out of the accessibility tree when decorative', () => {
    const { container } = render(<Mascot expression="celebrating" decorative />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('reacts with a squash when the expression changes, not when it appears', () => {
    const { rerender } = render(<Mascot expression="happy" />);
    expect(motion.animate).not.toHaveBeenCalled();

    rerender(<Mascot expression="celebrating" />);

    expect(motion.animate).toHaveBeenCalledOnce();
    expect(screen.getByRole('img', { name: 'Maskottchen feiert' })).toBeInTheDocument();
  });

  it('changes the expression without the squash for users who prefer reduced motion', () => {
    motion.reduced = true;
    const { rerender } = render(<Mascot expression="thinking" />);

    rerender(<Mascot expression="sad" />);

    expect(motion.animate).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Maskottchen ist traurig' })).toBeInTheDocument();
  });
});
