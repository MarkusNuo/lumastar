import { SparkleIcon, TargetIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { PlacementResult } from '../../../api/types';
import { parseLevel } from '../../../app/learnerStats';
import { Button } from '../../../components/ui/Button';
import { FocusScreen } from '../../../components/ui/FocusScreen';
import { LevelBadgePop } from '../../../components/ui/LevelBadgePop';
import { Mascot } from '../../../components/ui/Mascot';
import { celebrate } from '../../../lib/celebrate';
import { playCue } from '../../../lib/effects/playCue';
import { durations, springs } from '../../../styles/motion';
import { PLACEMENT_COPY } from '../copy';
import { SkillList } from './SkillList';
import { useRevealMoment } from './useRevealMoment';

const copy = PLACEMENT_COPY.reveal;

export interface LevelRevealProps {
  result: PlacementResult;
  onContinue: () => void;
}

const hidden = { opacity: 0, y: 16 };
const shown = { opacity: 1, y: 0 };

/**
 * The animated level reveal after the placement (PRD 12.3): the mascot thinks for a moment, then
 * the level badge springs in with confetti, followed by the strengths and weaknesses.
 */
export function LevelReveal({ result, onContinue }: LevelRevealProps) {
  const revealed = useRevealMoment();
  useCelebration(revealed);
  const { level, sublevel } = parseLevel(result.level);
  const details = { ...springs.gentle, delay: durations.base };

  return (
    <FocusScreen
      backdrop
      className="items-center gap-5 pt-4 pb-6 text-center"
      footer={
        <Button variant="primary" size="lg" fullWidth disabled={!revealed} onClick={onContinue}>
          {copy.toPlan}
        </Button>
      }
    >
      <Mascot expression={revealed ? 'celebrating' : 'thinking'} size="lg" />
      <p className="text-caption font-black tracking-wider text-primary-soft uppercase">
        {copy.eyebrow}
      </p>
      <LevelBadgePop level={level} sublevel={sublevel} size="xl" revealed={revealed} />
      <motion.div
        initial={hidden}
        animate={revealed ? shown : undefined}
        transition={details}
        className="flex flex-col gap-1"
      >
        <h1 className="text-headline font-black text-xp">
          {result.skipped ? copy.skippedLevel(result.level) : copy.level(result.level)}
        </h1>
        <p className="text-lead font-extrabold">{result.levelTitle}</p>
        <p className="text-body text-fg-muted">
          {result.skipped ? copy.skippedText : copy.answered(result.answeredCount)}
        </p>
      </motion.div>
      {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
        <motion.div
          initial={hidden}
          animate={revealed ? shown : undefined}
          transition={{ ...details, delay: durations.slow * 2 }}
          className="flex w-full flex-col gap-3"
        >
          {result.strengths.length > 0 && (
            <SkillList
              title={copy.strengths}
              icon={SparkleIcon}
              tone="success"
              skills={result.strengths}
            />
          )}
          {result.weaknesses.length > 0 && (
            <SkillList
              title={copy.weaknesses}
              icon={TargetIcon}
              tone="warning"
              skills={result.weaknesses}
            />
          )}
        </motion.div>
      )}
    </FocusScreen>
  );
}

/** Confetti and the level-up sound once the level shows; celebrate() skips reduced motion. */
function useCelebration(revealed: boolean) {
  const celebrated = useRef(false);
  useEffect(() => {
    if (!revealed || celebrated.current) return;
    celebrated.current = true;
    celebrate();
    playCue('levelUp');
  }, [revealed]);
}
