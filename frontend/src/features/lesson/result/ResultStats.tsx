import { LightningIcon, TargetIcon, TimerIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import type { Tone } from '../../../components/ui/tones';
import { springs } from '../../../styles/motion';
import { LESSON_COPY } from '../copy';
import type { LessonResult } from '../model';
import { entranceDelay } from './entrance';
import { formatDuration, formatPercent } from './format';
import { useCountUp } from './useCountUp';

const copy = LESSON_COPY.result;

export interface ResultStatsProps {
  result: LessonResult;
  /** Green for a good result; a failed checkpoint shows its accuracy in the hint colour. */
  accuracyTone?: Tone;
  /** Delays the cards, e.g. until a reveal has shown. */
  delay?: number;
}

/** The result cards of a lesson end (PRD 12.3): XP counting up, accuracy and time. */
export function ResultStats({ result, accuracyTone = 'success', delay = 0 }: ResultStatsProps) {
  return (
    <div className="grid w-full grid-cols-3 gap-3">
      <StatEntrance order={0} delay={delay}>
        <StatCard label={copy.xp} icon={LightningIcon} tone="xp">
          {result.xp ? <XpValue xp={result.xp.earned} /> : '–'}
          <span className="sr-only">
            {result.xp ? copy.xpValue(result.xp.earned) : copy.xpUnknown}
          </span>
        </StatCard>
      </StatEntrance>
      <StatEntrance order={1} delay={delay}>
        <StatCard label={copy.accuracy} icon={TargetIcon} tone={accuracyTone}>
          {formatPercent(result.accuracy)}
        </StatCard>
      </StatEntrance>
      <StatEntrance order={2} delay={delay}>
        <StatCard label={copy.time} icon={TimerIcon} tone="secondary">
          {formatDuration(result.durationMs)}
        </StatCard>
      </StatEntrance>
    </div>
  );
}

export interface StatEntranceProps {
  /** Position in the sequence; each card follows the previous one. */
  order: number;
  /** Seconds before the sequence starts. */
  delay?: number;
  children: ReactNode;
}

/** The result cards spring in one after another, after the mascot. */
export function StatEntrance({ order, delay = 0, children }: StatEntranceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springs.bouncy, delay: entranceDelay(order, delay) }}
      className="w-full min-w-0"
    >
      {children}
    </motion.div>
  );
}

function XpValue({ xp }: { xp: number }) {
  const shown = useCountUp(xp);
  return <span aria-hidden="true">+{shown}</span>;
}
