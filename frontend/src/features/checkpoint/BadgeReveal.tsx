import { motion } from 'motion/react';
import type { LevelBadgeCode } from '../../api/types';
import { BandBadge } from '../../components/ui/BandBadge';
import { Button } from '../../components/ui/Button';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { levelTone } from '../../components/ui/levels';
import { Mascot } from '../../components/ui/Mascot';
import { useCelebration } from '../../lib/useCelebration';
import { REVEAL_DELAY_MS, useRevealMoment } from '../../lib/useRevealMoment';
import { durations, springs } from '../../styles/motion';
import { CHECKPOINT_COPY } from './copy';

const copy = CHECKPOINT_COPY.badge;

/** Shorter than the level reveal: the level-up moment came just before. */
const BADGE_DELAY_MS = REVEAL_DELAY_MS / 2;

export interface BadgeRevealProps {
  /** Usually one; a checkpoint can complete two bands after a high placement. */
  badges: readonly LevelBadgeCode[];
  onContinue: () => void;
}

/** The level badges a checkpoint earned, springing in with a glow and confetti. */
export function BadgeReveal({ badges, onContinue }: BadgeRevealProps) {
  const revealed = useRevealMoment(BADGE_DELAY_MS);
  useCelebration(revealed, 'complete');
  const highest = badges.at(-1);

  return (
    <FocusScreen
      backdrop
      className="items-center justify-center gap-6 pb-6 text-center"
      footer={
        <Button variant="primary" size="lg" fullWidth disabled={!revealed} onClick={onContinue}>
          {copy.continue}
        </Button>
      }
    >
      <p className="text-caption font-black tracking-wider text-xp uppercase">
        {copy.eyebrow(badges.length)}
      </p>
      <div className="relative flex items-end justify-center gap-4">
        {highest && (
          <span
            aria-hidden="true"
            data-tone={levelTone[highest]}
            className="absolute inset-0 m-auto size-44 rounded-full bg-tone-face opacity-30 blur-glow"
          />
        )}
        {badges.map((band, index) => (
          <motion.div
            key={band}
            initial={{ scale: 0.2, rotate: -30, opacity: 0, y: 40 }}
            animate={revealed ? { scale: 1, rotate: 0, opacity: 1, y: 0 } : undefined}
            transition={{ ...springs.bouncy, delay: index * durations.slow }}
          >
            <BandBadge band={band} size={badges.length > 1 ? 'lg' : 'xl'} shine />
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={revealed ? { opacity: 1, y: 0 } : undefined}
        transition={{ ...springs.gentle, delay: durations.slow }}
        className="flex flex-col gap-1"
      >
        <h1 className="text-headline font-black text-xp">{copy.title(badges)}</h1>
        <p className="text-body text-fg-muted">{copy.text(badges)}</p>
      </motion.div>
      <Mascot expression="celebrating" size="md" />
    </FocusScreen>
  );
}
