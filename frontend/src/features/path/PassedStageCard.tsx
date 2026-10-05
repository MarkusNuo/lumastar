import { TrophyIcon } from '@phosphor-icons/react';
import type { PassedStage } from '../../api/types';
import { formatShare } from '../../lib/formatPercent';
import { PATH_COPY } from './copy';

const copy = PATH_COPY.passedStage;
const swissDate = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' });

/**
 * The stage passed last, collapsed above the current one with its golden trophy, so the path
 * shows where the learner comes from (PRD 12.3).
 */
export function PassedStageCard({ stage }: { stage: PassedStage }) {
  return (
    <section
      aria-label={copy.label(stage.level, stage.title)}
      data-testid="passed-stage"
      className="flex items-center gap-4 rounded-card border-2 border-border bg-surface p-4"
    >
      <span
        aria-hidden="true"
        data-tone="xp"
        className="grid size-14 shrink-0 place-items-center rounded-full tone-solid edge-3d"
      >
        <TrophyIcon size={30} weight="fill" />
      </span>
      <div className="min-w-0">
        <p className="text-micro font-black tracking-wider text-xp uppercase">{copy.eyebrow}</p>
        <p className="text-body font-black text-fg">{PATH_COPY.stage(stage.level, stage.title)}</p>
        <p className="text-caption font-bold text-fg-muted">
          {copy.detail(swissDate.format(new Date(stage.passedAt)), formatShare(stage.accuracy))}
        </p>
      </div>
    </section>
  );
}
