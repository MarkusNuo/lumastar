import { StreakCalendar } from './calendar/StreakCalendar';
import type { GoalChoice } from './goal/GoalChooser';
import { StreakGoalCard } from './goal/StreakGoalCard';
import type { StreakOverview } from './model';
import { StreakFreezeCard } from './StreakFreezeCard';
import { StreakHero } from './StreakHero';

export interface StreakDetailsProps {
  overview: StreakOverview;
  /** The first month the calendar goes back to. */
  earliestMonth: string;
  onMonthChange: (month: string) => void;
  /** Another calendar month is loading. */
  monthLoading?: boolean;
  goalChoice: GoalChoice;
}

/** The streak screen from top to bottom: number and flame, calendar, goal, streak freeze. */
export function StreakDetails({
  overview,
  earliestMonth,
  onMonthChange,
  monthLoading = false,
  goalChoice,
}: StreakDetailsProps) {
  return (
    <>
      <StreakHero {...overview} />
      <StreakCalendar
        calendar={overview.calendar}
        today={overview.today}
        earliestMonth={earliestMonth}
        onMonthChange={onMonthChange}
        busy={monthLoading}
      />
      <StreakGoalCard goal={overview.goal} streak={overview.current} choice={goalChoice} />
      <StreakFreezeCard freezes={overview.freezes} />
    </>
  );
}
