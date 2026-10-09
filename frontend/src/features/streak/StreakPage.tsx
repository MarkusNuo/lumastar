import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useGoBack } from '../../app/useGoBack';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { clampMonth, isMonth, monthRange } from './calendar/calendarMonth';
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
 * The calendar month is in the URL (`?month=2026-09`), so a reload keeps it. A month there that
 * the calendar cannot reach (more than a year back, still to come, or no month at all) turns into
 * the nearest one it can, in the URL too.
 */
export function StreakPage() {
  const goBack = useGoBack('/');
  const [params, setParams] = useSearchParams();
  const asked = params.get(MONTH_PARAM);
  const streak = useQuery(streakQuery(asked !== null && isMonth(asked) ? asked : undefined));
  const goalChoice = useGoalChoice();
  const loaded = streak.data;
  // Which months are in reach depends on today in the learner's time zone, which the server knows.
  const range = loaded && monthRange(loaded.today, HISTORY_MONTHS);
  // A month out of reach never shows, not even while the nearest one in reach loads.
  const overview =
    range && clampMonth(loaded.calendar.month, range) === loaded.calendar.month
      ? loaded
      : undefined;
  const reachable = range && asked !== null ? clampMonth(asked, range) : asked;
  const current = range?.current;

  const openMonth = useCallback(
    (month: string) =>
      // Replaced, not pushed: going back leaves the screen instead of stepping through the months.
      setParams(month === current ? {} : { [MONTH_PARAM]: month }, { replace: true }),
    [current, setParams],
  );

  useEffect(() => {
    if (reachable !== null && reachable !== asked) openMonth(reachable);
  }, [reachable, asked, openMonth]);

  return (
    <StreakScreen onBack={goBack}>
      {overview && range ? (
        <StreakDetails
          overview={overview}
          earliestMonth={range.earliest}
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
