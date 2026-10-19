import { motion } from 'motion/react';
import { useState } from 'react';
import type { CheckpointResult } from '../../api/types';
import { parseLevel } from '../../app/learnerStats';
import { Button } from '../../components/ui/Button';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { LevelBadgePop } from '../../components/ui/LevelBadgePop';
import { Mascot } from '../../components/ui/Mascot';
import { useCelebration } from '../../lib/useCelebration';
import { useRevealMoment } from '../../lib/useRevealMoment';
import { durations, springs } from '../../styles/motion';
import type { LessonResult } from '../lesson/model';
import { FocusSuggestionCard } from '../lesson/result/FocusSuggestionCard';
import { ResultStats, StatEntrance } from '../lesson/result/ResultStats';
import { AccuracyGoal } from './AccuracyGoal';
import { BadgeReveal } from './BadgeReveal';
import { CHECKPOINT_COPY } from './copy';

export interface CheckpointResultScreenProps {
  result: LessonResult;
  checkpoint: CheckpointResult;
  onContinue: () => void;
  onStartFocus: (unitId: string) => void;
}

/**
 * The end of a checkpoint: a pass celebrates the new level and then reveals
 * the badges it earned, one moment per screen; a fail encourages and shows how close it was.
 */
export function CheckpointResultScreen({
  result,
  checkpoint,
  onContinue,
  onStartFocus,
}: CheckpointResultScreenProps) {
  const [showBadges, setShowBadges] = useState(false);

  if (!checkpoint.passed) {
    return (
      <CheckpointFailed
        result={result}
        checkpoint={checkpoint}
        onContinue={onContinue}
        onStartFocus={onStartFocus}
      />
    );
  }
  if (showBadges) return <BadgeReveal badges={checkpoint.badges} onContinue={onContinue} />;
  return (
    <CheckpointPassed
      result={result}
      checkpoint={checkpoint}
      onContinue={checkpoint.badges.length > 0 ? () => setShowBadges(true) : onContinue}
    />
  );
}

const hidden = { opacity: 0, y: 16 };
const shown = { opacity: 1, y: 0 };

interface CheckpointPassedProps {
  result: LessonResult;
  checkpoint: CheckpointResult;
  onContinue: () => void;
}

function CheckpointPassed({ result, checkpoint, onContinue }: CheckpointPassedProps) {
  const copy = CHECKPOINT_COPY.passed;
  const revealed = useRevealMoment();
  useCelebration(revealed, 'levelUp');
  // Passing the last stage completes C2 without a new level.
  const reached =
    checkpoint.newLevel && checkpoint.newLevel !== checkpoint.level
      ? checkpoint.newLevel
      : undefined;
  const { level, sublevel } = parseLevel(reached ?? checkpoint.level);

  return (
    <FocusScreen
      backdrop
      className="items-center gap-5 pt-4 pb-6 text-center"
      footer={
        <Button variant="primary" size="lg" fullWidth disabled={!revealed} onClick={onContinue}>
          {copy.continue}
        </Button>
      }
    >
      <Mascot expression={revealed ? 'celebrating' : 'thinking'} size="lg" />
      <p className="text-caption font-black tracking-wider text-xp uppercase">
        {copy.eyebrow(checkpoint.level)}
      </p>
      <LevelBadgePop level={level} sublevel={sublevel} size="xl" revealed={revealed} />
      <motion.div
        initial={hidden}
        animate={revealed ? shown : undefined}
        transition={{ ...springs.gentle, delay: durations.base }}
        className="flex flex-col gap-1"
      >
        <h1 className="text-headline font-black text-xp">
          {reached ? copy.newLevel(reached) : copy.mastered(checkpoint.level)}
        </h1>
        <p className="text-body text-fg-muted">{copy.text}</p>
      </motion.div>
      {revealed && <ResultStats result={result} delay={durations.slow} />}
    </FocusScreen>
  );
}

interface CheckpointFailedProps {
  result: LessonResult;
  checkpoint: CheckpointResult;
  onContinue: () => void;
  onStartFocus: (unitId: string) => void;
}

function CheckpointFailed({ result, checkpoint, onContinue, onStartFocus }: CheckpointFailedProps) {
  const copy = CHECKPOINT_COPY.failed;

  return (
    <FocusScreen
      className="items-center gap-5 pt-6 pb-4 text-center"
      footer={
        <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
          {copy.later}
        </Button>
      }
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springs.bouncy}
      >
        <Mascot expression="encouraging" size="xl" />
      </motion.div>
      <div className="flex flex-col gap-1">
        <p className="text-caption font-black tracking-wider text-fg-subtle uppercase">
          {copy.eyebrow(checkpoint.level)}
        </p>
        <h1 className="text-headline font-black">{copy.title}</h1>
        <p className="text-body text-fg-muted">
          {copy.text(result.accuracy, checkpoint.requiredAccuracy)}
        </p>
      </div>
      <AccuracyGoal accuracy={result.accuracy} required={checkpoint.requiredAccuracy} />
      <ResultStats result={result} accuracyTone="warning" />
      {result.focusSuggestion && (
        <StatEntrance order={3}>
          <FocusSuggestionCard suggestion={result.focusSuggestion} onStart={onStartFocus} />
        </StatEntrance>
      )}
    </FocusScreen>
  );
}
