import { PencilSimpleIcon } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Trophy } from '../../../components/ui/Trophy';
import { STREAK_COPY } from '../copy';
import type { StreakGoal } from '../model';
import { GoalChooser, GoalSavedNote, type GoalChoice } from './GoalChooser';
import { goalChoices } from './goalLadder';

const copy = STREAK_COPY.goal;

export interface StreakGoalCardProps {
  goal: StreakGoal;
  /** The current streak; the goal can change to any rung of the ladder above it. */
  streak: number;
  choice: GoalChoice;
}

/**
 * The progressive streak goal (DECISIONS #98): progress towards it, the next goals once it is
 * reached, and a way to switch to another goal before.
 */
export function StreakGoalCard({ goal, streak, choice }: StreakGoalCardProps) {
  const titleId = useId();
  const [changing, setChanging] = useState(false);
  const { target, progress, reached, options } = goal;
  const chooserOpen = changing && choice.status !== 'saved';

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
          <h2 id={titleId} className="text-micro font-black tracking-wider text-fg-muted uppercase">
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
          <GoalChooser
            label={copy.changeLabel}
            options={goalChoices(streak, target)}
            choice={choice}
          />
          <Button variant="ghost" size="sm" onClick={() => setChanging(false)}>
            {copy.cancel}
          </Button>
        </>
      )}
      {!reached && !chooserOpen && (
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
