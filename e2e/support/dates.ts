import type { Page } from '@playwright/test';

/**
 * A day of the plan ("2027-03-01") as the app shows it ("1. März 2027"), formatted by the browser
 * under test, so the expectation uses the same locale data as the screen.
 */
export function shownDay(page: Page, isoDay: string): Promise<string> {
  return page.evaluate((day) => {
    const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
    return new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(year, month - 1, date),
    );
  }, isoDay);
}
