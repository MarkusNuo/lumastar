import { CheckCircleIcon, LockSimpleIcon, TrophyIcon, type Icon } from '@phosphor-icons/react';
import type { CheckpointStatus, LevelProgress } from '../../api/types';
import { parseLevel } from '../../app/learnerStats';
import { Card } from '../../components/ui/Card';
import { LevelBadge } from '../../components/ui/LevelBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import type { Tone } from '../../components/ui/tones';
import { StatsSection } from './StatsSection';
import { STATS_COPY } from './copy';

const copy = STATS_COPY.level;

const CHECKPOINT_LOOK: Record<CheckpointStatus, { icon: Icon; tone: Tone }> = {
  locked: { icon: LockSimpleIcon, tone: 'locked' },
  available: { icon: TrophyIcon, tone: 'xp' },
  passed: { icon: CheckCircleIcon, tone: 'success' },
};

/** The learner's stage and how far it is to its checkpoint, which leads to the next stage (PRD F10). */
export function LevelProgressCard({ level }: { level: LevelProgress | undefined }) {
  return (
    <StatsSection title={copy.title}>
      <Card variant="raised" padding="lg" className="flex flex-col gap-4">
        {level ? <LevelDetails level={level} /> : <NoLevel />}
      </Card>
    </StatsSection>
  );
}

function LevelDetails({ level }: { level: LevelProgress }) {
  const badge = parseLevel(level.level);
  const look = CHECKPOINT_LOOK[level.checkpoint];
  const CheckpointIcon = look.icon;
  const done = level.unitsCompleted + level.unitsSkipped;

  return (
    <>
      <div className="flex items-center gap-4">
        {/* The text names the level; the badge only decorates it. */}
        <span aria-hidden="true" className="inline-flex shrink-0">
          <LevelBadge level={badge.level} sublevel={badge.sublevel} size="lg" />
        </span>
        <div className="min-w-0">
          <p className="text-title font-black">{copy.stage(level.level, level.title)}</p>
          <p className="text-label font-bold text-fg-muted">
            {level.nextLevel ? copy.next(level.nextLevel) : copy.lastStage}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <ProgressBar
          label={copy.progressLabel}
          value={level.percent}
          valueText={copy.progressValue(level.percent)}
          tone="aurora"
        />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-caption font-extrabold">
          <span className="text-fg-muted">{copy.units(done, level.unitsTotal)}</span>
          <span data-tone={look.tone} className="inline-flex items-center gap-1 text-tone-text">
            <CheckpointIcon aria-hidden="true" size={16} weight="fill" />
            {copy.checkpoint[level.checkpoint]}
          </span>
        </div>
      </div>
    </>
  );
}

function NoLevel() {
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden="true" className="inline-flex shrink-0">
        <LevelBadge level="A0" size="lg" locked />
      </span>
      <div className="min-w-0">
        <p className="text-lead font-black">{copy.none}</p>
        <p className="text-label font-bold text-fg-muted">{copy.noneText}</p>
      </div>
    </div>
  );
}
