import type { Level, Profile } from '../api/types';
import type { LevelSublevel } from '../components/ui/LevelBadge';
import { CEFR_LEVELS, type CefrLevel } from '../components/ui/levels';
import type { TopBarProps } from './TopBar';

export interface LevelParts {
  level: CefrLevel;
  sublevel?: LevelSublevel;
}

const SUBLEVELS: Record<string, LevelSublevel> = { '1': 1, '2': 2, '3': 3 };

/** The shape of every Level: A0, or a band from A1 to C2 with sub-stage 1 to 3. */
const LEVEL_PATTERN = /^(?:A0|[ABC][12]\.[123])$/u;

/** For levels from outside the API, e.g. a URL. */
export function isLevel(value: string): value is Level {
  return LEVEL_PATTERN.test(value);
}

/** "A1.2" → { level: 'A1', sublevel: 2 }; "A0" has no sub-stages. */
export function parseLevel(level: Level): LevelParts {
  const [cefr, sub] = level.split('.');
  const parsed = CEFR_LEVELS.find((candidate) => candidate === cefr);
  if (!parsed) throw new Error(`Unknown level ${level}`);
  const sublevel = sub === undefined ? undefined : SUBLEVELS[sub];
  return sublevel === undefined ? { level: parsed } : { level: parsed, sublevel };
}

/**
 * Top-bar values from the profile. Streak and daily goal have no API before M5 and start at zero;
 * without a placement result the badge shows A0 greyed out.
 */
export function topBarStats(profile: Profile | undefined): TopBarProps {
  const level = profile?.currentLevel ? parseLevel(profile.currentLevel) : undefined;
  return {
    level: level?.level ?? 'A0',
    sublevel: level?.sublevel,
    levelLocked: level === undefined,
    streakDays: 0,
    streakActive: false,
    xp: profile?.xpTotal ?? 0,
    dailyGoalProgress: 0,
  };
}
