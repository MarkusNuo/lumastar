import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { playCue } from '../../lib/effects/playCue';
import { PathNode } from './PathNode';

vi.mock('../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

describe('PathNode', () => {
  it('starts the lesson with a tap sound', async () => {
    const onClick = vi.fn();
    render(<PathNode status="current" color="violet" label="Lektion 4" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Lektion 4, als Nächstes' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(playCue).toHaveBeenCalledWith('tap');
  });

  it('answers a tap on a locked lesson with the locked cue instead of opening it', async () => {
    const onClick = vi.fn();
    render(<PathNode status="locked" color="violet" label="Lektion 5" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Lektion 5, gesperrt' }));

    expect(onClick).not.toHaveBeenCalled();
    expect(playCue).toHaveBeenCalledWith('locked');
  });
});
