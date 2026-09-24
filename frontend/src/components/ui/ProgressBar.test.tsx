import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes its value, range and name to assistive technology', () => {
    render(
      <ProgressBar value={3} max={12} label="Lektionsfortschritt" valueText="3 von 12 Übungen" />,
    );

    const bar = screen.getByRole('progressbar', { name: 'Lektionsfortschritt' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '12');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuetext', '3 von 12 Übungen');
  });

  it('defaults to a range of 0 to 100', () => {
    render(<ProgressBar value={40} label="Fortschritt" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
  });

  it.each([
    [15, '12'],
    [-2, '0'],
  ])('clamps %d into the range', (value, expected) => {
    render(<ProgressBar value={value} max={12} label="Fortschritt" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', expected);
  });
});
