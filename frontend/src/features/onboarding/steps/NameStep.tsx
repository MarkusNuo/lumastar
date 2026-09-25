import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { ScreenFooter } from '../../../components/ui/FocusScreen';
import { MascotMessage } from '../../../components/ui/MascotMessage';
import { TextField } from '../../../components/ui/TextField';
import { SETUP_COPY } from '../copy';
import { DISPLAY_NAME_MAX_LENGTH, validateDisplayName } from '../setupRules';
import { StepTransition } from '../StepTransition';
import type { StepDirection } from '../useStepFlow';

const copy = SETUP_COPY.name;

export interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  direction: StepDirection;
}

export function NameStep({ value, onChange, onNext, direction }: NameStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const error = submitted ? validateDisplayName(value) : undefined;

  useEffect(() => inputRef.current?.focus(), []);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (validateDisplayName(value) === undefined) onNext();
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-1 flex-col">
      <StepTransition direction={direction} className="flex flex-col gap-8 pt-4 pb-6">
        <MascotMessage>
          <h1>{copy.question}</h1>
        </MascotMessage>
        <TextField
          ref={inputRef}
          label={copy.label}
          placeholder={copy.placeholder}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          value={value}
          hint={copy.hint}
          error={error && copy.errors[error]}
          onChange={(event) => onChange(event.target.value)}
        />
      </StepTransition>
      <ScreenFooter>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={validateDisplayName(value) === 'required'}
        >
          {copy.next}
        </Button>
      </ScreenFooter>
    </form>
  );
}
