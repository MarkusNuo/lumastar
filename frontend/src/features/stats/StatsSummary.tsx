import { BookOpenTextIcon, FireIcon, TrophyIcon } from '@phosphor-icons/react';
import { StatCard } from '../../components/ui/StatCard';
import { STATS_COPY } from './copy';

const copy = STATS_COPY.summary;

export interface StatsSummaryProps {
  /** Absent while today's progress loads. */
  streak?: { current: number; longest: number };
  learnedWords: number;
}

const format = (value: number | undefined) =>
  value === undefined ? '–' : value.toLocaleString('de-CH');

/** The headline numbers: streak, longest streak and learned words. */
export function StatsSummary({ streak, learnedWords }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label={copy.streak} icon={FireIcon} tone="warning">
        <span aria-hidden="true">{format(streak?.current)}</span>
        {streak && <span className="sr-only">{copy.streakValue(streak.current)}</span>}
      </StatCard>
      <StatCard label={copy.longest} icon={TrophyIcon} tone="xp">
        <span aria-hidden="true">{format(streak?.longest)}</span>
        {streak && <span className="sr-only">{copy.longestValue(streak.longest)}</span>}
      </StatCard>
      <StatCard label={copy.words} icon={BookOpenTextIcon} tone="primary">
        <span aria-hidden="true">{format(learnedWords)}</span>
        <span className="sr-only">{copy.wordsValue(learnedWords)}</span>
      </StatCard>
    </div>
  );
}
