import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { PATHS } from './env.ts';

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
    path: file,
    animations: 'disabled',
    caret: 'hide',
    ...(options.style ? { style: options.style } : {}),
  } as const;
  if (options.element) {
    await options.element.screenshot(settings);
  } else {
    await page.screenshot({ ...settings, fullPage: options.fullPage ?? true });
  }
  return file;
}
