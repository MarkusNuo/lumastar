import { DailyGoalRing } from '../components/ui/DailyGoalRing';
import { LevelBadge, type LevelSublevel } from '../components/ui/LevelBadge';
import type { CefrLevel } from '../components/ui/levels';
import { StreakCounter } from '../components/ui/StreakCounter';
import { XpCounter } from '../components/ui/XpCounter';

export interface TopBarProps {
  level: CefrLevel;
  sublevel?: LevelSublevel;
  /** No level determined yet (before the placement test). */
  levelLocked?: boolean;
  streakDays: number;
  streakActive: boolean;
  xp: number;
  dailyGoalProgress: number;
}

export function TopBar({
  level,
  sublevel,
  levelLocked = false,
  streakDays,
  streakActive,
  xp,
  dailyGoalProgress,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-(--z-bar) border-b-2 border-border bg-bg pt-(--safe-top)">
      <div className="flex h-(--spacing-top-bar) items-center justify-between px-gutter">
        <LevelBadge level={level} sublevel={sublevel} locked={levelLocked} size="sm" />
        <StreakCounter days={streakDays} active={streakActive} />
        <XpCounter xp={xp} />
        <DailyGoalRing progress={dailyGoalProgress} />
      </div>
    </header>
  );
}
