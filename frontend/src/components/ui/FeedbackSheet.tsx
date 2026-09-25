import {
  CheckIcon,
  LightbulbIcon,
  PencilSimpleLineIcon,
  TranslateIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef } from 'react';
import { springs } from '../../styles/motion';
import { Button } from './Button';
import { EmphasisText } from './EmphasisText';
import type { ButtonVariant } from './buttonStyles';
import type { Tone } from './tones';

/** correct · almost (typo, still counts) · standard (Standard Albanian form) · wrong */
export type FeedbackVariant = 'correct' | 'almost' | 'standard' | 'wrong';

interface VariantConfig {
  tone: Tone;
  button: ButtonVariant;
  icon: Icon;
  title: string;
  solutionLabel: string;
}

const VARIANTS: Record<FeedbackVariant, VariantConfig> = {
  correct: {
    tone: 'success',
    button: 'success',
    icon: CheckIcon,
    title: 'Richtig!',
    solutionLabel: 'Lösung',
  },
  almost: {
    tone: 'warning',
    button: 'warning',
    icon: PencilSimpleLineIcon,
    title: 'Fast richtig!',
    solutionLabel: 'Richtige Schreibweise',
  },
  standard: {
    tone: 'secondary',
    button: 'secondary',
    icon: TranslateIcon,
    title: 'Richtig, aber Standard',
    solutionLabel: 'Auf Gheg',
  },
  wrong: {
    tone: 'danger',
    button: 'danger',
    icon: XIcon,
    title: 'Nicht ganz',
    solutionLabel: 'Richtige Lösung',
  },
};

export interface FeedbackSheetProps {
  open: boolean;
  variant: FeedbackVariant;
  /** Overrides the default title of the variant. */
  title?: string;
  solution?: string;
  /** Language of the solution text, e.g. "sq" for Gheg answers. */
  solutionLang?: string;
  explanation?: string;
  /** Words wrapped in `**` are set in bold. */
  hint?: string;
  continueLabel?: string;
  onContinue: () => void;
}

export function FeedbackSheet({ open, ...panelProps }: FeedbackSheetProps) {
  return (
    <AnimatePresence>{open && <FeedbackPanel key="feedback" {...panelProps} />}</AnimatePresence>
  );
}

function FeedbackPanel({
  variant,
  title,
  solution,
  solutionLang,
  explanation,
  hint,
  continueLabel = 'Weiter',
  onContinue,
}: Omit<FeedbackSheetProps, 'open'>) {
  const config = VARIANTS[variant];
  const TitleIcon = config.icon;
  const titleId = useId();
  const bodyId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);

  // Focus "Weiter" so Enter continues right after checking, as in the lesson flow.
  useEffect(() => {
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-tone={config.tone}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={springs.sheet}
      className="fixed inset-x-0 bottom-0 z-(--z-sheet) mx-auto max-w-app rounded-t-sheet bg-tone-surface px-gutter pt-5 pb-[calc(var(--safe-bottom)+1.25rem)] shadow-sheet"
    >
      {/* Live region: the backend's verdict can replace the instant one while the sheet is open. */}
      <div aria-live="polite">
        <div className="flex items-center gap-3">
          <motion.span
            key={variant}
            initial={{ scale: 0.4, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={springs.bouncy}
            className="grid size-11 shrink-0 place-items-center rounded-full tone-solid"
          >
            <TitleIcon aria-hidden="true" size={26} weight="bold" />
          </motion.span>
          <h2 id={titleId} className="text-title font-black text-tone-text">
            {title ?? config.title}
          </h2>
        </div>

        <div id={bodyId} className="mt-3 flex flex-col gap-2">
          {solution && (
            <div>
              <p className="text-label font-extrabold text-tone-text">{config.solutionLabel}:</p>
              <p lang={solutionLang} className="text-lead font-extrabold text-fg">
                {solution}
              </p>
            </div>
          )}
          {hint && (
            <p className="flex items-start gap-2.5 rounded-card-sm bg-bg/45 p-3 text-label font-bold text-fg">
              <LightbulbIcon
                aria-hidden="true"
                size={20}
                weight="fill"
                className="mt-px shrink-0 text-warning"
              />
              <span>
                <EmphasisText text={hint} strongClassName="font-black text-tone-text" />
              </span>
            </p>
          )}
          {explanation && <p className="text-body font-semibold text-fg-muted">{explanation}</p>}
        </div>
      </div>

      <Button
        ref={continueRef}
        variant={config.button}
        size="lg"
        fullWidth
        className="mt-5"
        onClick={onContinue}
      >
        {continueLabel}
      </Button>
    </motion.div>
  );
}
