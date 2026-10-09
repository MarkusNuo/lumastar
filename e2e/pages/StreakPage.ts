import { expect, type Locator, type Page } from '@playwright/test';
import {
  addDays,
  daysOfMonth,
  isGoalUpdate,
  nextMondayAfter,
  weekdayOf,
  type StreakCalendarDay,
  type StreakOverview,
} from '../support/streakApi.ts';

/** How a day of the streak calendar shows: a streak day (met or frozen), a past day without, or to come. */
export type CalendarDayState = 'met' | 'frozen' | 'open' | 'future';
/** The part of a streak band a day is: days in a row join into one band within a week row. */
export type BandShape = 'start' | 'middle' | 'end' | 'single';

/** One day cell of the calendar as the screen shows it, or as the rules of M10 expect it. */
export interface CalendarCell {
  date: string;
  label: string;
  state: CalendarDayState;
  today: boolean;
  band: BandShape | null;
  /** The colour of the band: ice blue for a frozen day. */
  tone: 'streak' | 'freeze' | null;
}

const DAY_STATE_LABEL: Record<CalendarDayState, string> = {
  met: 'Streak-Tag',
  frozen: 'Streak-Schutz eingesetzt',
  open: 'kein Streak-Tag',
  future: '',
};

/** "1 Tag", "10 Tage" */
export const days = (count: number) => `${count} ${count === 1 ? 'Tag' : 'Tage'}`;

/**
 * The cells of a month as the owner asked for them (M10): weeks start on Monday; a band runs on into
 * the day before and after when that day is a streak day of the same month and the same week row;
 * a day bridged by the streak freeze is part of the band in ice blue. Labels without the day names,
 * which the browser formats (`withLabels`).
 */
export function expectedCells(
  month: string,
  streakDays: StreakCalendarDay[],
  today: string,
): Omit<CalendarCell, 'label'>[] {
  const status = new Map(streakDays.map((day) => [day.date, day.status]));
  const isStreakDay = (date: string) => date.startsWith(month) && status.has(date);
  return daysOfMonth(month).map((date) => {
    const streakStatus = status.get(date);
    const state: CalendarDayState = streakStatus ?? (date > today ? 'future' : 'open');
    if (!streakStatus) return { date, state, today: date === today, band: null, tone: null };
    const before = weekdayOf(date) > 0 && isStreakDay(addDays(date, -1));
    const after = weekdayOf(date) < 6 && isStreakDay(addDays(date, 1));
    const band: BandShape = before && after ? 'middle' : before ? 'end' : after ? 'start' : 'single';
    return { date, state, today: date === today, band, tone: streakStatus === 'frozen' ? 'freeze' : 'streak' };
  });
}

/**
 * Route /streak behind the flame of the top bar (M10): the hero with the streak and its flame, the
 * month calendar with the streak bands, the streak goal and the streak freeze.
 */
export class StreakPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly backButton: Locator;
  readonly hero: Locator;
  readonly heroFlame: Locator;
  readonly calendar: Locator;
  readonly monthTitle: Locator;
  readonly previousMonth: Locator;
  readonly nextMonth: Locator;
  readonly calendarTable: Locator;
  /** The day cells of the shown month (the padding cells of the first and last week have no state). */
  readonly dayCells: Locator;
  readonly legend: Locator;
  readonly goalCard: Locator;
  readonly goalProgress: Locator;
  readonly changeGoalButton: Locator;
  readonly cancelGoalButton: Locator;
  readonly goalSaved: Locator;
  readonly freezeCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Streak', level: 1, exact: true });
    this.backButton = page.getByRole('button', { name: 'Zurück', exact: true });
    this.hero = page.getByTestId('streak-hero');
    this.heroFlame = this.hero.locator('[data-lit]');
    this.calendar = page.getByTestId('streak-calendar');
    this.monthTitle = this.calendar.getByRole('heading', { level: 2 });
    this.previousMonth = this.calendar.getByRole('button', { name: 'Vorheriger Monat', exact: true });
    this.nextMonth = this.calendar.getByRole('button', { name: 'Nächster Monat', exact: true });
    this.calendarTable = this.calendar.getByRole('table');
    this.dayCells = this.calendarTable.locator('td[data-state]');
    this.legend = this.calendar.getByRole('list', { includeHidden: true });
    this.goalCard = page.getByTestId('streak-goal');
    this.goalProgress = this.goalCard.getByRole('progressbar', { name: 'Fortschritt zum Streak-Ziel', exact: true });
    this.changeGoalButton = this.goalCard.getByRole('button', { name: 'Ziel ändern', exact: true });
    this.cancelGoalButton = this.goalCard.getByRole('button', { name: 'Abbrechen', exact: true });
    this.goalSaved = this.goalCard.getByRole('status');
    this.freezeCard = page.getByTestId('streak-freezes');
  }

  async goto(month?: string): Promise<void> {
    await this.page.goto(month ? `/streak?month=${month}` : '/streak');
    await this.expectVisible();
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/streak(\?month=\d{4}-\d{2})?$/);
    await expect(this.heading).toBeVisible();
    await expect(this.hero).toBeVisible();
  }

  /** The chips of a goal chooser, named e.g. "Neues Ziel" or "Wähle dein nächstes Ziel.". */
  goalChooser(name: string): Locator {
    return this.goalCard.getByRole('radiogroup', { name, exact: true });
  }

  goalOption(target: number): Locator {
    return this.goalCard.getByRole('radio', { name: days(target), exact: true });
  }

  /** Taps a goal chip of the card, as a learner does, and waits until the goal is saved. */
  async chooseGoal(target: number): Promise<void> {
    const saved = this.page.waitForResponse(isGoalUpdate);
    await this.goalCard.getByRole('radiogroup').getByText(days(target), { exact: true }).click();
    const response = await saved;
    expect(response.status(), await response.text()).toBe(200);
    await expect(this.goalSaved).toHaveText(`Neues Ziel: ${days(target)}`);
  }

  /** "Oktober 2026", as the browser formats it. */
  monthName(month: string): Promise<string> {
    return this.page.evaluate((shown) => {
      const [year = 0, monthNumber = 1] = shown.split('-').map(Number);
      return new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' }).format(
        new Date(year, monthNumber - 1, 1),
      );
    }, month);
  }

  /** "Montag, 12. Oktober", as the browser formats it. */
  weekdayName(isoDay: string): Promise<string> {
    return this.page.evaluate((day) => {
      const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
      return new Intl.DateTimeFormat('de-CH', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        new Date(year, month - 1, date),
      );
    }, isoDay);
  }

  /** The labels the cells must have: "3. Oktober: Streak-Schutz eingesetzt", "8. Oktober, heute: Streak-Tag". */
  async withLabels(cells: Omit<CalendarCell, 'label'>[]): Promise<CalendarCell[]> {
    const names = await this.page.evaluate(
      (dates) =>
        dates.map((day) => {
          const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
          return new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long' }).format(
            new Date(year, month - 1, date),
          );
        }),
      cells.map((cell) => cell.date),
    );
    return cells.map((cell, index) => {
      const name = names[index] ?? '';
      const stateLabel = cell.state === 'open' && cell.today ? 'Tagesziel noch offen' : DAY_STATE_LABEL[cell.state];
      const label = cell.today ? `${name}, heute: ${stateLabel}` : cell.state === 'future' ? name : `${name}: ${stateLabel}`;
      return { ...cell, label };
    });
  }

  /** The day cells as the screen shows them: label, state, today mark, band shape and tone. */
  shownCells(): Promise<Omit<CalendarCell, 'date'>[]> {
    return this.dayCells.evaluateAll((cells) =>
      cells.map((cell) => {
        const band = cell.querySelector('[data-band]');
        return {
          label: cell.getAttribute('aria-label') ?? '',
          state: cell.getAttribute('data-state') as CalendarDayState,
          today: cell.hasAttribute('data-today'),
          band: (band?.getAttribute('data-band') ?? null) as BandShape | null,
          tone: (band?.getAttribute('data-tone') ?? null) as 'streak' | 'freeze' | null,
        };
      }),
    );
  }

  /** The shown month: its title, its weeks (Monday first) and every day cell with its band. */
  async expectMonth(month: string, streakDays: StreakCalendarDay[], today: string): Promise<void> {
    await expect(this.monthTitle).toHaveText(await this.monthName(month));
    await expect(this.calendarTable).not.toHaveAttribute('aria-busy', 'true');
    const headers = this.calendarTable.getByRole('columnheader');
    await expect(headers).toHaveText(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    const expected = await this.withLabels(expectedCells(month, streakDays, today));
    expect(await this.shownCells(), `the days of ${month}`).toEqual(
      expected.map(({ label, state, today: isToday, band, tone }) => ({ label, state, today: isToday, band, tone })),
    );
    // The first day sits in its weekday's column (Monday first), the rest follow row by row.
    const firstRow = this.calendarTable.getByRole('row').nth(1);
    const firstDay = daysOfMonth(month)[0] ?? `${month}-01`;
    await expect(firstRow.getByRole('cell').nth(weekdayOf(firstDay))).toHaveAttribute('data-state', /.+/);
    const rows = Math.ceil((weekdayOf(firstDay) + daysOfMonth(month).length) / 7);
    await expect(this.calendarTable.locator('tbody tr')).toHaveCount(rows);

    const streakDayCount = streakDays.filter((day) => day.date.startsWith(month)).length;
    const frozen = streakDays.filter((day) => day.date.startsWith(month) && day.status === 'frozen').length;
    const summary =
      streakDayCount === 0
        ? 'In diesem Monat gibt es noch keine Streak-Tage.'
        : `${streakDayCount === 1 ? '1 Streak-Tag' : `${streakDayCount} Streak-Tage`} in diesem Monat` +
          (frozen > 0 ? `, ${frozen} davon mit Streak-Schutz` : '');
    await expect(this.calendar.getByText(summary, { exact: true })).toBeVisible();
  }

  /** Hero, calendar of the shown month, goal and freeze card as GET /api/streak reports them. */
  async expectOverview(overview: StreakOverview): Promise<void> {
    await this.expectHero(overview);
    await this.expectMonth(overview.calendar.month, overview.calendar.days, overview.today);
    await this.expectLegend();
    await this.expectGoal(overview.goal);
    await this.expectFreezes(overview);
  }

  /** The number with the flame on its right, lit once today's goal has extended the streak. */
  async expectHero({ current, longest, extendedToday, minutesToday, goalMinutes }: StreakOverview): Promise<void> {
    await expect(this.hero.getByText(`${days(current)} Streak`, { exact: true }), 'read aloud').toBeAttached();
    await expect(this.hero.getByText(String(current), { exact: true })).toBeVisible();
    await expect(this.hero.getByText(current === 1 ? 'Tag Streak' : 'Tage Streak', { exact: true })).toBeVisible();
    await expect(this.heroFlame).toHaveAttribute('data-lit', String(extendedToday));
    await expect(
      this.hero.getByText(
        extendedToday ? 'Heute geschafft!' : `Heute noch ${Math.max(0, goalMinutes - minutesToday)} Min. bis zum Tagesziel`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(this.hero.getByText(`Rekord: ${days(longest)}`, { exact: true })).toBeVisible();
    const number = await this.hero.getByText(String(current), { exact: true }).boundingBox();
    const flame = await this.heroFlame.boundingBox();
    expect(number && flame && flame.x > number.x + number.width, 'the flame stands right of the number').toBe(true);
  }

  async expectLegend(): Promise<void> {
    for (const entry of ['Streak-Tag', 'Streak-Schutz', 'Heute']) {
      await expect(this.legend.getByText(entry, { exact: true })).toBeVisible();
    }
  }

  /** Target, progress and, once reached, the next goals to choose from. */
  async expectGoal({ target, progress, reached, options }: StreakOverview['goal']): Promise<void> {
    await expect(this.goalCard).toHaveAttribute('data-reached', String(reached));
    await expect(this.goalCard.getByRole('heading', { name: 'Streak-Ziel', level: 2 })).toBeVisible();
    await expect(
      this.goalCard.getByText(reached ? `Ziel erreicht: ${days(target)}!` : `Ziel: ${days(target)}`, { exact: true }),
    ).toBeVisible();
    await expect(this.goalProgress).toHaveAttribute('aria-valuetext', `${progress} von ${target} Tagen`);
    await expect(this.goalProgress).toHaveAttribute('aria-valuenow', String(progress));
    await expect(this.goalProgress).toHaveAttribute('aria-valuemax', String(target));
    if (reached) {
      const chooser = this.goalChooser('Wähle dein nächstes Ziel.');
      await expect(chooser.getByRole('radio')).toHaveCount(options.length);
      for (const option of options) await expect(chooser.getByRole('radio', { name: days(option) })).not.toBeChecked();
      await expect(this.changeGoalButton).toHaveCount(0);
    } else {
      await expect(this.goalCard.getByText(`Noch ${days(target - progress)}`, { exact: true })).toBeVisible();
      await expect(this.changeGoalButton).toBeVisible();
    }
  }

  /** "1 von 1 bereit" or "Diese Woche eingesetzt", the next Monday and the last day a freeze bridged. */
  async expectFreezes({ freezes, today }: StreakOverview): Promise<void> {
    const card = this.freezeCard;
    expect(freezes.resetsOn, 'the Monday after today in the learner\'s time zone').toBe(nextMondayAfter(today));
    await expect(card.getByRole('heading', { name: 'Streak-Schutz', level: 2 })).toBeVisible();
    await expect(
      card.getByText(freezes.available > 0 ? `${freezes.available} von ${freezes.perWeek} bereit` : 'Diese Woche eingesetzt', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      card.getByText(
        'Verpasst du einen Tag, rettet ein Streak-Schutz deinen Streak automatisch. Pro Woche gibt es einen.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      card.getByText(`Wird am ${await this.weekdayName(freezes.resetsOn)} zurückgesetzt.`, { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByText(
        freezes.lastUsedOn
          ? `Zuletzt eingesetzt am ${await this.weekdayName(freezes.lastUsedOn)}.`
          : 'Bisher noch nie gebraucht.',
        { exact: true },
      ),
    ).toBeVisible();
  }
}
