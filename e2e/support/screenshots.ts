import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { PATHS } from './env.ts';

export interface SnapOptions {
  /** Capture the whole scrollable page instead of the visible viewport (default: true). */
  fullPage?: boolean;
  /** Capture only this element instead of the page. */
  element?: Locator;
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

  const settings = { path: file, animations: 'disabled', caret: 'hide' } as const;
  if (options.element) {
    await options.element.screenshot(settings);
  } else {
    await page.screenshot({ ...settings, fullPage: options.fullPage ?? true });
  }
  return file;
}
