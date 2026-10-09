import { PencilSimpleIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Trophy } from '../../../components/ui/Trophy';
import { focusInPlace } from '../../../lib/focus';
import { STREAK_COPY } from '../copy';
import type { StreakGoal } from '../model';
import { GoalChooser, GoalSavedNote, type GoalChoice } from './GoalChooser';

const copy = STREAK_COPY.goal;

export interface StreakGoalCardProps {
  /** Its `options` are the goals the learner may choose now: the next ones, or others before. */
  goal: StreakGoal;
  choice: GoalChoice;
}

/**
 * The progressive streak goal (DECISIONS #98): progress towards it, the next goals once it is
 * reached, and a way to switch to another goal before. The chips close on a save (and on
 * "Abbrechen"), so the focus moves to the card's heading instead of falling back to the page.
 */
export function StreakGoalCard({ goal, choice }: StreakGoalCardProps) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [changing, setChanging] = useState(false);
  const { target, progress, reached, options } = goal;
  const chooserOpen = changing && choice.status !== 'saved';
  useFocusOnSave(choice.status === 'saved', headingRef);

  return (
    <section
      aria-labelledby={titleId}
      data-testid="streak-goal"
      data-reached={reached}
      className="flex flex-col gap-4 rounded-card border-2 border-border bg-surface p-4"
    >
      <div className="flex items-center gap-4">
        <Trophy won={reached} engraving={target} className="size-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2
            ref={headingRef}
            id={titleId}
            tabIndex={-1}
            className="text-micro font-black tracking-wider text-fg-muted uppercase outline-none"
          >
            {copy.title}
          </h2>
          <p className="text-lead font-black text-fg">
            {reached ? copy.reached(target) : copy.target(target)}
          </p>
          {!reached && (
            <p className="text-label font-bold text-fg-muted">
              {copy.remaining(target - progress)}
            </p>
          )}
        </div>
      </div>
      <ProgressBar
        label={copy.progressLabel}
        value={progress}
        max={target}
        valueText={copy.progressValue(progress, target)}
        tone="xp"
      />
      {reached && <GoalChooser label={copy.chooseNext} options={options} choice={choice} />}
      {!reached && chooserOpen && (
        <>
          <GoalChooser label={copy.changeLabel} options={options} choice={choice} focusOnMount />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setChanging(false);
              focusInPlace(headingRef.current);
            }}
          >
            {copy.cancel}
          </Button>
        </>
      )}
      {!reached && !chooserOpen && options.length > 0 && (
        <Button
          variant="neutral"
          size="sm"
          icon={PencilSimpleIcon}
          onClick={() => {
            choice.reset();
            setChanging(true);
          }}
        >
          {copy.change}
        </Button>
      )}
      <GoalSavedNote choice={choice} />
    </section>
  );
}

/** Focuses `target` each time a goal is saved (not when the card shows a goal saved before). */
function useFocusOnSave(saved: boolean, target: RefObject<HTMLElement | null>) {
  const savedBefore = useRef(saved);
  useEffect(() => {
    if (saved && !savedBefore.current) focusInPlace(target.current);
    savedBefore.current = saved;
  }, [saved, target]);
}
