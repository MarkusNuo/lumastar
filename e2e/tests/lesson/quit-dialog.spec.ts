import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LessonPlayer } from '../../pages/LessonPlayer.ts';
import { isLessonStart } from '../../support/lessonApi.ts';
import { snap } from '../../support/screenshots.ts';

test('closing a lesson asks first: cancel keeps the lesson, confirm returns home', async ({ page }) => {
  const path = new LearningPathPage(page);
  const player = new LessonPlayer(page);
  const shell = new AppShell(page);

  await path.goto();
  const started = page.waitForResponse(isLessonStart);
  await path.startCurrentLesson();
  expect((await started).status()).toBe(201);
  const { id } = await player.current();

  await player.closeButton.click();
  await expect(player.quitDialog).toBeVisible();
  await expect(player.quitDialog).toContainText('Dein Fortschritt in dieser Lektion geht verloren.');
  const stay = player.quitDialog.getByRole('button', { name: 'Weiterlernen' });
  await expect(stay, 'the safe choice has the focus').toBeFocused();
  await expect(player.quitDialog).toBeInViewport({ ratio: 1 });
  await snap(page, 'quit-dialog', { fullPage: false });

  await stay.click();
  await expect(player.quitDialog).toBeHidden();
  await expect(page).toHaveURL(/\/lesson\/[^/]+$/);
  await expect(player.exercise, 'the same exercise is still on screen').toHaveAttribute(
    'data-exercise-id',
    id,
  );

  await player.closeButton.click();
  await player.quitDialog.getByRole('button', { name: 'Beenden' }).click();
  await shell.expectHome();
});
