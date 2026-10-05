import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BandBadge } from './BandBadge';
import { BADGE_BANDS, levelTone } from './levels';

describe('BandBadge', () => {
  it.each(BADGE_BANDS)('draws the %s badge in the colour of its band', (band) => {
    render(<BandBadge band={band} />);

    const badge = screen.getByRole('img', { name: `Abzeichen ${band}` });
    expect(badge).toHaveAttribute('data-tone', levelTone[band]);
    expect(badge).toHaveTextContent(band);
  });

  it('greys out a badge not earned yet and says so', () => {
    render(<BandBadge band="B2" locked shine />);

    const badge = screen.getByRole('img', { name: 'Abzeichen B2, noch nicht verdient' });
    expect(badge).toHaveAttribute('data-tone', 'locked');
    expect(badge.querySelector('[class*="animate-shine"]')).toBeNull();
  });

  it('lets a light sweep over a freshly earned badge', () => {
    render(<BandBadge band="A1" shine />);

    expect(
      screen.getByRole('img', { name: 'Abzeichen A1' }).querySelector('[class*="animate-shine"]'),
    ).not.toBeNull();
  });
});
