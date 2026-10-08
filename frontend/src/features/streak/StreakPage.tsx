import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useGoBack } from '../../app/useGoBack';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { isMonth, monthOf, shiftMonth } from './calendar/calendarMonth';
import { STREAK_COPY } from './copy';
import { StreakDetails } from './StreakDetails';
import { StreakScreen } from './StreakScreen';
import { streakQuery, useGoalChoice } from './streakApi';

const copy = STREAK_COPY.screen;

/** How far back the calendar goes, like the year of the activity heatmap. */
const HISTORY_MONTHS = 12;
const MONTH_PARAM = 'month';

/**
 * Route `/streak`, behind the flame of the top bar: the streak with its calendar, goal and freeze.
 * The calendar month is in the URL (`?month=2026-09`), so a reload keeps it.
 */
export function StreakPage() {
  const goBack = useGoBack('/');
  const [params, setParams] = useSearchParams();
  const asked = params.get(MONTH_PARAM);
  const streak = useQuery(streakQuery(asked !== null && isMonth(asked) ? asked : undefined));
  const goalChoice = useGoalChoice();
  const overview = streak.data;

  const openMonth = (month: string) => {
    const current = overview && monthOf(overview.today);
    // Replaced, not pushed: going back leaves the screen instead of stepping through the months.
    setParams(month === current ? {} : { [MONTH_PARAM]: month }, { replace: true });
  };

  return (
    <StreakScreen onBack={goBack}>
      {overview ? (
        <StreakDetails
          overview={overview}
          earliestMonth={shiftMonth(monthOf(overview.today), -HISTORY_MONTHS)}
          onMonthChange={openMonth}
          monthLoading={streak.isPlaceholderData}
          goalChoice={goalChoice}
        />
      ) : streak.isError ? (
        <LoadFailed
          message={copy.loadFailed}
          retrying={streak.isFetching}
          onRetry={() => void streak.refetch()}
        />
      ) : (
        <LoadingBlock label={copy.loading} className="h-96" />
      )}
    </StreakScreen>
  );
}
