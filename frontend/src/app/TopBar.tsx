import { DailyGoalRing } from '../components/ui/DailyGoalRing';
import { LevelBadge, type LevelSublevel } from '../components/ui/LevelBadge';
import type { CefrLevel } from '../components/ui/levels';
import { StreakCounter } from '../components/ui/StreakCounter';
import { UI_COPY } from '../components/ui/copy';
import { XpCounter } from '../components/ui/XpCounter';

export interface TopBarProps {
  level: CefrLevel;
  sublevel?: LevelSublevel;
  /** No level determined yet (before the placement test). */
  levelLocked?: boolean;
  streakDays: number;
  /** Today's goal is met and has extended the streak. */
  streakActive: boolean;
  /** Streak freezes left this week. */
  streakFreezes: number;
  xp: number;
  minutesToday: number;
  goalMinutes: number;
}

export function TopBar({
  level,
  sublevel,
  levelLocked = false,
  streakDays,
  streakActive,
  streakFreezes,
  xp,
  minutesToday,
  goalMinutes,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-(--z-bar) border-b-2 border-border bg-bg pt-(--safe-top)">
      <div className="flex h-(--spacing-top-bar) items-center justify-between px-gutter">
        <LevelBadge level={level} sublevel={sublevel} locked={levelLocked} size="sm" />
        <StreakCounter days={streakDays} active={streakActive} freezes={streakFreezes} />
        <XpCounter xp={xp} />
        <DailyGoalRing
          progress={goalMinutes > 0 ? minutesToday / goalMinutes : 0}
          valueText={UI_COPY.dailyGoalValue(minutesToday, goalMinutes)}
        />
      </div>
    </header>
  );
}
