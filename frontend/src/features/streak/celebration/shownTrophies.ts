import { safeLocalStorage } from '../../../lib/safeLocalStorage';

/*
 * The backend reports a reached streak goal again with every fetch of the result until the next
 * goal is chosen (e.g. after reloading the placement result). Its trophy shows once: this device
 * remembers which goals it celebrated today. A goal reached again on another day (after a broken
 * streak) gets its trophy again.
 */

export const SHOWN_TROPHIES_KEY = 'lingora:shown-streak-trophies';

function localDay(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function read(): string[] {
  try {
    const stored: unknown = JSON.parse(safeLocalStorage.getItem(SHOWN_TROPHIES_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((entry) => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

export function trophyShown(target: number, now = new Date()): boolean {
  return read().includes(`${localDay(now)}:${target}`);
}

export function rememberTrophy(target: number, now = new Date()): void {
  const today = localDay(now);
  // Only today's entries matter, so older ones are dropped on the way.
  const kept = read().filter((entry) => entry.startsWith(`${today}:`));
  safeLocalStorage.setItem(SHOWN_TROPHIES_KEY, JSON.stringify([...kept, `${today}:${target}`]));
}
