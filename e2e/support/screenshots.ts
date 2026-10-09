import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { PATHS } from './env.ts';
import type { LessonExercise } from './lessonApi.ts';
import { PHONES } from './phones.ts';

export interface SnapOptions {
  /** Capture the whole scrollable page instead of the visible viewport (default: true). */
  fullPage?: boolean;
  /** Capture only this element instead of the page. */
  element?: Locator;
  /** Extra CSS applied only while capturing, e.g. to keep a sticky header out of an element shot. */
  style?: string;
}

/**
 * Scrolls the page so the element starts `offset` px below the top of the viewport, e.g. below a
 * sticky top bar, so a viewport capture shows what follows it.
 */
export async function scrollToTop(element: Locator, offset = 0): Promise<void> {
  await element.evaluate((node, gap) => {
    window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - gap);
  }, offset);
}

/**
 * Saves a PNG for the visual design review (PRD 12.5) to
 * screenshots/<milestone>/<width>x<height>/<name>.png and returns its path.
 */
export async function snap(page: Page, name: string, options: SnapOptions = {}): Promise<string> {
  const viewport = page.viewportSize();
  const folder = viewport ? `${viewport.width}x${viewport.height}` : 'unknown-viewport';
  const file = path.join(PATHS.screenshots, folder, `${name}.png`);
  await mkdir(path.dirname(file), { recursive: true });

  // Self-hosted fonts load lazily; without this the first capture may show the fallback font.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  const settings = {
    animations: 'disabled',
    caret: 'hide',
    ...(options.style ? { style: options.style } : {}),
  } as const;
  const png = options.element
    ? await options.element.screenshot(settings)
    : await page.screenshot({ ...settings, fullPage: options.fullPage ?? true });
  await writeRetrying(file, png);
  return file;
}

/** Windows error codes of a file another process (virus scanner, indexer, image viewer) holds briefly. */
const BUSY_FILE = new Set(['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN']);
const WRITE_ATTEMPTS = 5;
const WRITE_BACKOFF_MS = 300;

/** Writes the capture, retrying a moment later while another process holds the file. */
async function writeRetrying(file: string, data: Buffer): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await writeFile(file, data);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? '';
      if (attempt === WRITE_ATTEMPTS || !BUSY_FILE.has(code)) throw error;
      await sleep(WRITE_BACKOFF_MS * attempt);
    }
  }
}

/**
 * Screens that exist only once per run (the first start, the lesson that meets today's goal) are
 * captured at every phone size of the run: the viewport is resized for each capture and restored.
 * `prepare` runs after each resize, e.g. to scroll the subject back under the top bar.
 */
export async function snapOnAllPhones(
  page: Page,
  name: string,
  options: SnapOptions = {},
  prepare?: () => Promise<void>,
): Promise<void> {
  const original = page.viewportSize();
  for (const phone of Object.values(PHONES)) {
    await page.setViewportSize(phone.viewport);
    await prepare?.();
    await snap(page, name, options);
  }
  if (original) await page.setViewportSize(original);
}

/** "exercise-<type>"; the two ways of filling a gap look different, so they get a name each. */
export function exerciseScreenName(exercise: Pick<LessonExercise, 'type' | 'choices'>): string {
  if (exercise.type === 'fill_gap') return exercise.choices ? 'exercise-fill_gap-choices' : 'exercise-fill_gap-typed';
  return `exercise-${exercise.type}`;
}
