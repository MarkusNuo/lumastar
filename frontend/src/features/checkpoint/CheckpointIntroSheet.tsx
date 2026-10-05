import { TrophyIcon } from '@phosphor-icons/react';
import { useId, useRef } from 'react';
import type { Level } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { CHECKPOINT_COPY } from './copy';

const copy = CHECKPOINT_COPY.intro;

/** The stage whose checkpoint the sheet introduces. */
export interface CheckpointIntro {
  level: Level;
  /** The level a pass leads to; absent for the last stage. */
  nextLevel?: Level;
  /** 15, or all exercises of the stage if it has fewer. */
  exerciseCount: number;
  /** Share of first answers that must be correct to pass, e.g. 0.8. */
  requiredAccuracy: number;
}

export interface CheckpointIntroSheetProps {
  open: boolean;
  /** Kept while the sheet slides out, so it does not empty on its way. */
  checkpoint?: CheckpointIntro;
  onStart: (level: Level) => void;
  onClose: () => void;
}

/** What the checkpoint at the end of a stage asks and what passing it brings (PRD chapter 5). */
export function CheckpointIntroSheet({
  open,
  checkpoint,
  onStart,
  onClose,
}: CheckpointIntroSheetProps) {
  const titleId = useId();
  const textId = useId();
  const startRef = useRef<HTMLButtonElement>(null);

  return (
    <Sheet
      open={open && checkpoint !== undefined}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={textId}
      initialFocusRef={startRef}
      className="flex flex-col items-center gap-3 text-center"
    >
      {checkpoint && (
        <>
          <span
            aria-hidden="true"
            data-tone="xp"
            className="grid size-20 place-items-center rounded-full tone-solid edge-3d"
          >
            <TrophyIcon size={44} weight="fill" />
          </span>
          <h2 id={titleId} className="text-title font-black">
            {copy.title(checkpoint.level)}
          </h2>
          <p
            data-tone="xp"
            className="rounded-full tone-outline px-4 py-1.5 text-label font-black tabular-nums"
          >
            {copy.facts(checkpoint.exerciseCount, checkpoint.requiredAccuracy)}
          </p>
          <div id={textId} className="flex flex-col gap-1">
            <p className="text-body font-extrabold text-fg">
              {checkpoint.nextLevel ? copy.levelUp(checkpoint.nextLevel) : copy.lastStage}
            </p>
            <p className="text-label font-bold text-fg-muted">{copy.text}</p>
          </div>
          <div className="mt-2 flex w-full flex-col gap-3">
            <Button
              ref={startRef}
              variant="primary"
              size="lg"
              fullWidth
              icon={TrophyIcon}
              onClick={() => onStart(checkpoint.level)}
            >
              {copy.start}
            </Button>
            <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
              {copy.later}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
