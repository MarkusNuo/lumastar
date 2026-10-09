import { expect, type Locator, type Page } from '@playwright/test';

export const NAV_LABELS = ['Lernen', 'Wiederholen', 'Statistik', 'Profil'] as const;
export type NavLabel = (typeof NAV_LABELS)[number];

/** What the streak counter tells a screen reader, e.g. "Streak: 3 Tage, Streak-Schutz bereit". */
export function streakText(days: number, active: boolean, freezes: number): string {
  const unit = days === 1 ? 'Tag' : 'Tage';
  return `Streak: ${days} ${unit}${active ? '' : ', heute noch nicht gelernt'}${freezes > 0 ? ', Streak-Schutz bereit' : ''}`;
}

/** The value of a daily-goal ring: "3 von 5 Min.", or "erreicht, 6 Min. geübt" once the goal is met. */
export function goalRingText(minutes: number, goalMinutes: number): string {
  return minutes >= goalMinutes ? `erreicht, ${minutes} Min. geübt` : `${minutes} von ${goalMinutes} Min.`;
}

/** The filled share of a daily-goal ring in percent, as its progressbar reports it. */
export function goalRingPercent(minutes: number, goalMinutes: number): number {
  return Math.round(Math.min(1, goalMinutes > 0 ? minutes / goalMinutes : 0) * 100);
}

/** Signed-in app frame: top bar, the current tab and the bottom navigation (PRD 12.3). */
export class AppShell {
  readonly page: Page;
  readonly topBar: Locator;
  readonly bottomNav: Locator;
  readonly profileHeading: Locator;
  readonly logoutButton: Locator;
  /** Screen-reader text of the XP counter in the top bar, e.g. "120 XP". */
  readonly xpLabel: Locator;
  /** Screen-reader text of the streak counter (PRD F9), see `streakText`. */
  readonly streakLabel: Locator;
  /** The small shield on the flame while a streak freeze of this week is left. */
  readonly freezeShield: Locator;
  /** The daily-goal ring of the top bar (PRD 12.3). */
  readonly goalRing: Locator;
  /** The flame of the top bar, a link to the streak screen (M10), named like `streakLabel`. */
  readonly streakLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topBar = page.getByRole('banner');
    this.bottomNav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    this.profileHeading = page.getByRole('heading', { name: 'Profil', level: 1 });
    this.logoutButton = page.getByRole('button', { name: 'Abmelden' });
    this.xpLabel = this.topBar.getByText(/^\d+ XP$/);
    this.streakLabel = this.topBar.getByText(/^Streak: /);
    this.freezeShield = this.topBar.getByTestId('streak-freeze');
    this.goalRing = this.topBar.getByRole('progressbar', { name: 'Tagesziel', exact: true });
    this.streakLink = this.topBar.getByRole('link', { name: /^Streak: / });
  }

  /** Taps the flame of the top bar, which opens the streak screen (M10). */
  async openStreak(): Promise<void> {
    await this.streakLink.tap();
    await expect(this.page).toHaveURL(/\/streak$/);
  }

  /**
   * Whether the flame of the streak counter burns: its outer tongue is painted in the streak colour
   * of the design tokens, not in the grey of locked things.
   */
  async flameIsLit(): Promise<boolean> {
    const counter = this.streakLabel.locator('xpath=..');
    return counter.locator('svg path').first().evaluate((path) => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--color-streak)';
      document.body.append(probe);
      const streak = getComputedStyle(probe).color;
      probe.remove();
      return getComputedStyle(path).fill === streak;
    });
  }

  /** Streak, flame and goal ring of the top bar as GET /api/progress/today reports them. */
  async expectProgress(progress: {
    minutesToday: number;
    goalMinutes: number;
    streak: { current: number; extendedToday: boolean; freezesLeft: number };
  }): Promise<void> {
    const { minutesToday, goalMinutes, streak } = progress;
    await expect(this.streakLabel).toHaveText(
      streakText(streak.current, streak.extendedToday, streak.freezesLeft),
    );
    await expect.poll(() => this.flameIsLit(), { message: 'the flame burns once the goal is met' }).toBe(
      streak.extendedToday,
    );
    await expect(this.freezeShield).toHaveCount(streak.freezesLeft > 0 ? 1 : 0);
    await expect(this.goalRing).toHaveAttribute('aria-valuetext', goalRingText(minutesToday, goalMinutes));
    await expect(this.goalRing).toHaveAttribute(
      'aria-valuenow',
      String(goalRingPercent(minutesToday, goalMinutes)),
    );
  }

  navLink(label: NavLabel): Locator {
    return this.bottomNav.getByRole('link', { name: label });
  }

  async expectHome(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$/);
    await expect(this.bottomNav).toBeVisible();
    for (const label of NAV_LABELS) await expect(this.navLink(label)).toBeVisible();
    await expect(this.navLink('Lernen')).toHaveAttribute('aria-current', 'page');
    await expect(this.topBar).toBeVisible();
  }

  async openProfile(): Promise<void> {
    await this.navLink('Profil').click();
    await expect(this.page).toHaveURL(/\/profil$/);
    await expect(this.profileHeading).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.openProfile();
    await this.logoutButton.click();
  }
}
