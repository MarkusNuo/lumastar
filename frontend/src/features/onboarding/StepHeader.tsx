import { ArrowLeftIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ONBOARDING_COPY } from './copy';
import {
  COUNTED_STEPS,
  stepProgress,
  type AccountStep,
  type QuestionStep,
} from './onboardingSteps';

export interface StepHeaderProps {
  step: AccountStep | QuestionStep;
  /** Absent where there is no way back, e.g. on the first question after the account exists. */
  onBack?: () => void;
  backDisabled?: boolean;
  /** At the end of the row, e.g. the account menu once the account exists. */
  action?: ReactNode;
}

/** Back button and the progress bar shared by all counted onboarding steps. */
export function StepHeader({ step, onBack, backDisabled = false, action }: StepHeaderProps) {
  const progress = stepProgress(step);
  return (
    <>
      {onBack ? (
        <IconButton
          icon={ArrowLeftIcon}
          label={ONBOARDING_COPY.back}
          variant="ghost"
          disabled={backDisabled}
          onClick={onBack}
        />
      ) : (
        // Keeps the progress bar at the same place as on the steps with a back button.
        <span aria-hidden="true" className="size-12 shrink-0" />
      )}
      <ProgressBar
        label={ONBOARDING_COPY.progressLabel}
        value={progress.value}
        max={progress.max}
        valueText={ONBOARDING_COPY.progressValue(progress.number, COUNTED_STEPS)}
      />
      {action}
    </>
  );
}
