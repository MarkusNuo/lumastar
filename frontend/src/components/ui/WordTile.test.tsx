import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { playCue } from '../../lib/effects/playCue';
import { WordTile } from './WordTile';

vi.mock('../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

describe('WordTile', () => {
  it('clicks with a soft tap sound', async () => {
    const onClick = vi.fn();
    render(<WordTile onClick={onClick}>shpija</WordTile>);

    await userEvent.click(screen.getByRole('button', { name: 'shpija' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(playCue).toHaveBeenCalledWith('tap');
  });

  it('leaves only an empty slot in the bank once placed', () => {
    render(<WordTile state="placed">shpija</WordTile>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
