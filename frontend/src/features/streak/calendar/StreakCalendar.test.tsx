import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_EMPTY_MONTH, SAMPLE_STREAK } from '../sampleStreak';
import { StreakCalendar, type StreakCalendarProps } from './StreakCalendar';

function renderCalendar(props: Partial<StreakCalendarProps> = {}) {
  const onMonthChange = vi.fn();
  render(
    <StreakCalendar
      calendar={SAMPLE_STREAK.calendar}
      today={SAMPLE_STREAK.today}
      earliestMonth="2025-10"
      onMonthChange={onMonthChange}
      {...props}
    />,
  );
  return { onMonthChange, user: userEvent.setup() };
}

const day = (label: string) => screen.getByRole('cell', { name: label });

describe('StreakCalendar', () => {
  it('names every day with its streak state', () => {
    renderCalendar();

    expect(screen.getByRole('table', { name: 'Oktober 2026' })).toBeInTheDocument();
    expect(day('1. Oktober: Streak-Tag')).toBeInTheDocument();
    expect(day('3. Oktober: Streak-Schutz eingesetzt')).toBeInTheDocument();
    expect(day('8. Oktober, heute: Streak-Tag')).toHaveAttribute('data-today', 'true');
    expect(day('9. Oktober')).toHaveAttribute('data-state', 'future');
  });

  it('joins the streak days into a band that breaks at the end of the week', () => {
    renderCalendar();
    const band = (label: string) =>
      day(label).querySelector('[data-band]')?.getAttribute('data-band');

    expect(band('1. Oktober: Streak-Tag')).toBe('start');
    expect(band('3. Oktober: Streak-Schutz eingesetzt')).toBe('middle');
    expect(band('4. Oktober: Streak-Tag')).toBe('end');
    expect(band('5. Oktober: Streak-Tag')).toBe('start');
    expect(band('8. Oktober, heute: Streak-Tag')).toBe('end');
    expect(
      day('3. Oktober: Streak-Schutz eingesetzt').querySelector('[data-band]'),
    ).toHaveAttribute('data-tone', 'freeze');
    expect(
      screen.getByText('8 Streak-Tage in diesem Monat, 1 davon mit Streak-Schutz'),
    ).toBeVisible();
  });

  it('goes back a month but not past today', async () => {
    const { onMonthChange, user } = renderCalendar();

    expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Vorheriger Monat' }));

    expect(onMonthChange).toHaveBeenCalledWith('2026-09');
  });

  it('says so for a month without streak days and stops at the earliest month', () => {
    renderCalendar({ calendar: SAMPLE_EMPTY_MONTH, earliestMonth: '2026-08' });

    expect(screen.getByText('In diesem Monat gibt es noch keine Streak-Tage.')).toBeVisible();
    expect(day('3. August: kein Streak-Tag')).toHaveAttribute('data-state', 'open');
    expect(screen.getByRole('button', { name: 'Vorheriger Monat' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeEnabled();
  });
});
