import { useId } from 'react';
import { Button } from '../../../components/ui/Button';
import { Callout } from '../../../components/ui/Callout';
import { ScreenFooter } from '../../../components/ui/FocusScreen';
import { MascotMessage } from '../../../components/ui/MascotMessage';
import { OptionCard } from '../../../components/ui/OptionCard';
import type { ChoiceOption } from '../onboardingOptions';
import { StepTransition } from '../StepTransition';
import type { StepDirection } from '../useStepFlow';

export interface ChoiceStepProps<Value extends string | number> {
  question: string;
  hint: string;
  options: ChoiceOption<Value>[];
  isSelected: (value: Value) => boolean;
  onSelect: (value: Value) => void;
  onNext: () => void;
  nextLabel: string;
  canContinue: boolean;
  pending?: boolean;
  failure?: string;
  direction: StepDirection;
}

/** An onboarding question answered by tapping big option cards. */
export function ChoiceStep<Value extends string | number>({
  question,
  hint,
  options,
  isSelected,
  onSelect,
  onNext,
  nextLabel,
  canContinue,
  pending = false,
  failure,
  direction,
}: ChoiceStepProps<Value>) {
  const questionId = useId();
  const hintId = useId();

  return (
    <div className="flex flex-1 flex-col">
      <StepTransition direction={direction} className="flex flex-col gap-6 pt-4 pb-6">
        <div className="flex flex-col gap-3">
          <MascotMessage>
            <h1 id={questionId}>{question}</h1>
          </MascotMessage>
          <p id={hintId} className="px-1 text-label font-bold text-fg-muted">
            {hint}
          </p>
        </div>
        <div
          role="group"
          aria-labelledby={questionId}
          aria-describedby={hintId}
          className="flex flex-col gap-3"
        >
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <OptionCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={isSelected(option.value)}
                marker={<OptionIcon aria-hidden="true" size={22} weight="bold" />}
                onClick={() => onSelect(option.value)}
              />
            );
          })}
        </div>
        {failure && <Callout tone="danger">{failure}</Callout>}
      </StepTransition>
      <ScreenFooter>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={pending}
          disabled={!canContinue}
          onClick={onNext}
        >
          {nextLabel}
        </Button>
      </ScreenFooter>
    </div>
  );
}
