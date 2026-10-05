import { expect, type Locator, type Page } from '@playwright/test';
import type { PlacementResult, SkillEstimate } from '../support/placementApi.ts';

/** "30 %" as the reveal formats a mastery share (Swiss German, rounded). */
export const percentOf = (mastery: number) => new RegExp(`^${Math.round(mastery * 100)}\\s?%$`);

/** The animated level reveal after a placement (/einstufung/ergebnis/:testId, PRD 12.3). */
export class LevelRevealPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly strengths: Locator;
  readonly weaknesses: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.strengths = page.getByRole('region', { name: 'Das kannst du schon gut' });
    this.weaknesses = page.getByRole('region', { name: 'Daran arbeiten wir' });
    this.continueButton = page.getByRole('button', { name: 'Meinen Lernplan ansehen' });
  }

  badge(level: string): Locator {
    return this.page.getByRole('img', { name: `Niveau ${level}`, exact: true });
  }

  /** Level, stage title, the line below and exactly the strengths and weaknesses of the result. */
  async expectResult(result: PlacementResult): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/einstufung/ergebnis/${result.testId}$`));
    await expect(this.badge(result.level)).toBeVisible();
    await expect(this.heading).toHaveText(
      result.skipped ? `Du startest bei ${result.level}` : `Du bist auf Niveau ${result.level}`,
    );
    await expect(this.page.getByText(result.levelTitle, { exact: true })).toBeVisible();
    const answered = `${result.answeredCount} ${result.answeredCount === 1 ? 'Frage' : 'Fragen'} beantwortet – stark gemacht!`;
    await expect(
      this.page.getByText(
        result.skipped ? 'Wir fangen ganz vorne an: mit den Lauten und den ersten Wörtern.' : answered,
      ),
    ).toBeVisible();
    await expectSkills(this.strengths, result.strengths);
    await expectSkills(this.weaknesses, result.weaknesses);
    await expect(this.continueButton).toBeEnabled();
  }
}

/** A list shows its skills in the order of the result with their mastery; an empty one is left out. */
async function expectSkills(list: Locator, skills: readonly SkillEstimate[]): Promise<void> {
  if (skills.length === 0) {
    await expect(list).toBeHidden();
    return;
  }
  const rows = list.getByRole('listitem');
  await expect(rows).toHaveCount(skills.length);
  for (const [index, skill] of skills.entries()) {
    const row = rows.nth(index);
    await expect(row.getByText(skill.label, { exact: true })).toBeVisible();
    await expect(row.getByText(percentOf(skill.mastery))).toBeVisible();
    await expect(row.getByRole('progressbar', { name: skill.label })).toHaveAttribute(
      'aria-valuenow',
      String(Math.round(skill.mastery * 100)),
    );
  }
}
