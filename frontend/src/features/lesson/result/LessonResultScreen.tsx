import { ArrowClockwiseIcon, LightningIcon, TargetIcon, TimerIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { Callout } from '../../../components/ui/Callout';
import { Card } from '../../../components/ui/Card';
import { FocusScreen } from '../../../components/ui/FocusScreen';
import { Mascot } from '../../../components/ui/Mascot';
import { StatCard } from '../../../components/ui/StatCard';
import { celebrate } from '../../../lib/celebrate';
import { playCue } from '../../../lib/effects/playCue';
import { durations, springs } from '../../../styles/motion';
import { LESSON_COPY } from '../copy';
import type { LearnedItem, LessonResult, XpBreakdown } from '../model';
import { formatDuration, formatPercent } from './format';
import { useCountUp } from './useCountUp';

const copy = LESSON_COPY.result;

/** A long list would push the lesson end far down; the rest is one tap away. */
const COLLAPSED_WORDS = 6;

export interface LessonResultScreenProps {
  result: LessonResult;
  onContinue: () => void;
  /** Offered when the result could not be saved. */
  onRetrySave: () => void;
  retrying: boolean;
}

/** Lesson end (PRD 12.3): the mascot celebrates, confetti, XP counting up, accuracy and time. */
export function LessonResultScreen({
  result,
  onContinue,
  onRetrySave,
  retrying,
}: LessonResultScreenProps) {
  const celebrated = useRef(false);
  useEffect(() => {
    if (celebrated.current) return;
    celebrated.current = true;
    celebrate();
    playCue('complete');
  }, []);

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
          {perfect ? copy.perfectTitle : copy.title}
        </h1>
        <p className="text-body text-fg-muted">
          {copy.summary(result.correctCount, result.exerciseCount)}
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        <StatEntrance order={0}>
          <StatCard label={copy.xp} icon={LightningIcon} tone="xp">
            {result.xp ? <XpValue xp={result.xp.earned} /> : '–'}
            <span className="sr-only">
              {result.xp ? copy.xpValue(result.xp.earned) : copy.xpUnknown}
            </span>
          </StatCard>
        </StatEntrance>
        <StatEntrance order={1}>
          <StatCard label={copy.accuracy} icon={TargetIcon} tone="success">
            {formatPercent(result.accuracy)}
          </StatCard>
        </StatEntrance>
        <StatEntrance order={2}>
          <StatCard label={copy.time} icon={TimerIcon} tone="secondary">
            {formatDuration(result.durationMs)}
          </StatCard>
        </StatEntrance>
      </div>
      {result.xp && <XpBreakdownLine breakdown={result.xp.breakdown} />}

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
      {result.learnedItems.length > 0 && <LearnedWords items={result.learnedItems} />}
    </FocusScreen>
  );
}

/** The result cards spring in one after another, after the mascot. */
function StatEntrance({ order, children }: { order: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springs.bouncy, delay: durations.base + order * durations.press }}
      className="min-w-0"
    >
      {children}
    </motion.div>
  );
}

function XpValue({ xp }: { xp: number }) {
  const shown = useCountUp(xp);
  return <span aria-hidden="true">+{shown}</span>;
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
