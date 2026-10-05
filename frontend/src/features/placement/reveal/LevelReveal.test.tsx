import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { celebrate } from '../../../lib/celebrate';
import { SAMPLE_PLACEMENT_RESULT } from '../samplePlacement';
import { LevelReveal } from './LevelReveal';
import { REVEAL_DELAY_MS } from '../../../lib/useRevealMoment';

vi.mock('../../../lib/celebrate', () => ({ celebrate: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(celebrate).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

const toPlan = () => screen.getByRole('button', { name: 'Meinen Lernplan ansehen' });

describe('LevelReveal', () => {
  it('reveals the level after a short drum roll, with confetti once', () => {
    render(<LevelReveal result={SAMPLE_PLACEMENT_RESULT} onContinue={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Maskottchen denkt nach' })).toBeInTheDocument();
    expect(toPlan()).toBeDisabled();
    expect(celebrate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(REVEAL_DELAY_MS);
    });

    expect(screen.getByRole('img', { name: 'Maskottchen feiert' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Du bist auf Niveau A1.2');
    expect(screen.getByRole('img', { name: 'Niveau A1.2' })).toBeInTheDocument();
    expect(screen.getByText('Alltag zu Hause')).toBeInTheDocument();
    expect(screen.getByText('12 Fragen beantwortet – stark gemacht!')).toBeInTheDocument();
    expect(toPlan()).toBeEnabled();
    expect(celebrate).toHaveBeenCalledOnce();
  });

  it('lists the top 3 strengths and weaknesses with their estimated mastery', () => {
    render(<LevelReveal result={SAMPLE_PLACEMENT_RESULT} onContinue={vi.fn()} />);

    const strengths = screen.getByRole('region', { name: 'Das kannst du schon gut' });
    const weaknesses = screen.getByRole('region', { name: 'Daran arbeiten wir' });
    expect(within(strengths).getAllByRole('listitem')).toHaveLength(3);
    expect(within(strengths).getByRole('progressbar', { name: 'Begrüssung' })).toHaveAttribute(
      'aria-valuenow',
      '90',
    );
    expect(
      within(weaknesses)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Bestimmter Artikel30\u00a0%', 'Verb kam30\u00a0%', 'Essen & Trinken40\u00a0%']);
  });

  it('greets a skipped test as a fresh start at A0, without strengths and weaknesses', () => {
    const onContinue = vi.fn();
    render(
      <LevelReveal
        result={{
          ...SAMPLE_PLACEMENT_RESULT,
          level: 'A0',
          levelTitle: 'Erste Schritte',
          skipped: true,
          answeredCount: 0,
          strengths: [],
          weaknesses: [],
        }}
        onContinue={onContinue}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(REVEAL_DELAY_MS);
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Du startest bei A0');
    expect(screen.getByText(/ganz vorne an/)).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    act(() => toPlan().click());
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
