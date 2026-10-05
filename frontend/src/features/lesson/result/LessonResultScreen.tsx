import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useId, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Callout } from '../../../components/ui/Callout';
import { Card } from '../../../components/ui/Card';
import { FocusScreen } from '../../../components/ui/FocusScreen';
import { Mascot } from '../../../components/ui/Mascot';
import { useCelebration } from '../../../lib/useCelebration';
import { durations, springs } from '../../../styles/motion';
import { LESSON_COPY } from '../copy';
import type { LearnedItem, LessonResult, XpBreakdown } from '../model';
import { DailyGoalCard } from './DailyGoalCard';
import { FocusSuggestionCard } from './FocusSuggestionCard';
import { entranceDelay } from './entrance';
import { ResultStats, StatEntrance } from './ResultStats';

const copy = LESSON_COPY.result;

/** The daily goal springs in after the three result cards. */
const GOAL_ORDER = 3;

/** A long list would push the lesson end far down; the rest is one tap away. */
const COLLAPSED_WORDS = 6;

export interface LessonResultScreenProps {
  result: LessonResult;
  onContinue: () => void;
  /** Starts the suggested focus lesson. */
  onStartFocus: (unitId: string) => void;
  /** Offered when the result could not be saved. */
  onRetrySave: () => void;
  retrying: boolean;
}

/** Lesson end (PRD 12.3): the mascot celebrates, confetti, XP counting up, accuracy and time. */
export function LessonResultScreen({
  result,
  onContinue,
  onStartFocus,
  onRetrySave,
  retrying,
}: LessonResultScreenProps) {
  useCelebration(true, 'complete');

  const perfect = result.exerciseCount > 0 && result.correctCount === result.exerciseCount;

  return (
    <FocusScreen
      backdrop
      className="items-center gap-6 pt-6 pb-4 text-center"
      footer={
        <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
          {copy.continue}
        </Button>
      }
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springs.bouncy}
      >
        <Mascot expression="celebrating" size="xl" />
      </motion.div>
      <div className="flex flex-col gap-1">
        <h1 className="text-headline font-black text-xp">
          {perfect ? copy.perfectTitle : copy.titles[result.kind]}
        </h1>
        <p className="text-body text-fg-muted">
          {copy.summary(result.correctCount, result.exerciseCount)}
        </p>
      </div>

      <ResultStats result={result} />
      {result.xp && <XpBreakdownLine breakdown={result.xp.breakdown} />}
      {result.dailyGoal && (
        <StatEntrance order={GOAL_ORDER}>
          <DailyGoalCard
            goal={result.dailyGoal}
            delay={entranceDelay(GOAL_ORDER) + durations.base}
          />
        </StatEntrance>
      )}

      {!result.saved && (
        <div className="flex w-full flex-col gap-3 text-left">
          <Callout tone="warning">{copy.notSaved}</Callout>
          <Button
            variant="neutral"
            icon={ArrowClockwiseIcon}
            loading={retrying}
            onClick={onRetrySave}
          >
            {copy.retrySave}
          </Button>
        </div>
      )}
      {result.focusSuggestion && (
        <StatEntrance order={GOAL_ORDER + 1}>
          <FocusSuggestionCard suggestion={result.focusSuggestion} onStart={onStartFocus} />
        </StatEntrance>
      )}
      {result.learnedItems.length > 0 && <LearnedWords items={result.learnedItems} />}
    </FocusScreen>
  );
}

function XpBreakdownLine({ breakdown }: { breakdown: XpBreakdown }) {
  const parts = [
    { label: copy.breakdown.base, xp: breakdown.base },
    { label: copy.breakdown.perfectBonus, xp: breakdown.perfectBonus },
    { label: copy.breakdown.speedBonus, xp: breakdown.speedBonus },
  ].filter((part) => part.xp > 0);

  return (
    <ul className="-mt-2 flex flex-wrap justify-center gap-2 text-caption font-extrabold text-fg-muted">
      {parts.map((part) => (
        <li key={part.label} className="rounded-full bg-surface px-3 py-1">
          {part.label} <span className="text-xp">+{part.xp}</span>
        </li>
      ))}
    </ul>
  );
}

function LearnedWords({ items }: { items: LearnedItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const collapsible = items.length > COLLAPSED_WORDS;
  const shown = collapsible && !expanded ? items.slice(0, COLLAPSED_WORDS) : items;

  return (
    <Card variant="outline" padding="none" className="w-full text-left">
      <h2 className="px-4 pt-4 pb-2 text-label font-black tracking-wide text-fg-muted uppercase">
        {copy.learnedTitle}
      </h2>
      <ul id={listId} className="divide-y-2 divide-border">
        {shown.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5">
            <span lang="sq" className="text-body font-black">
              {item.gheg}
            </span>
            <span className="text-label font-bold text-fg-muted">{item.de}</span>
          </li>
        ))}
      </ul>
      {collapsible && (
        <div className="border-t-2 border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? copy.showFewerWords : copy.showAllWords(items.length)}
          </Button>
        </div>
      )}
    </Card>
  );
}
