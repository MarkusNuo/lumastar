import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Callout } from '../../../components/ui/Callout';
import { ScreenFooter } from '../../../components/ui/FocusScreen';
import { MascotMessage } from '../../../components/ui/MascotMessage';
import { PasswordField } from '../../../components/ui/PasswordField';
import { useShake } from '../../../lib/useShake';
import { SETUP_COPY } from '../copy';
import { hasErrors, validatePassword } from '../setupRules';
import { StepTransition } from '../StepTransition';
import type { StepDirection } from '../useStepFlow';

const copy = SETUP_COPY.password;

export interface PasswordStepProps {
  displayName: string;
  onSubmit: (password: string) => void;
  pending: boolean;
  /** Why the server refused the last attempt, if it did. */
  failure?: string;
  direction: StepDirection;
}

export function PasswordStep({
  displayName,
  onSubmit,
  pending,
  failure,
  direction,
}: PasswordStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [shakeScope, shake] = useShake();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // Errors appear after the first attempt and then follow the input live.
  const errors = submitted ? validatePassword(password, confirmation) : {};

  useEffect(() => inputRef.current?.focus(), []);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (pending) return;
    setSubmitted(true);
    if (hasErrors(validatePassword(password, confirmation))) {
      shake();
      return;
    }
    onSubmit(password);
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-1 flex-col">
      <StepTransition direction={direction} className="flex flex-col gap-8 pt-4 pb-6">
        <MascotMessage expression="encouraging">
          <h1>{copy.question(displayName)}</h1>
        </MascotMessage>
        <div ref={shakeScope} className="flex flex-col gap-5">
          <PasswordField
            ref={inputRef}
            label={copy.passwordLabel}
            autoComplete="new-password"
            enterKeyHint="next"
            value={password}
            hint={copy.passwordHint}
            error={errors.password && copy.errors[errors.password]}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && confirmation.length === 0) {
                event.preventDefault();
                confirmationRef.current?.focus();
              }
            }}
          />
          <PasswordField
            ref={confirmationRef}
            label={copy.confirmationLabel}
            autoComplete="new-password"
            enterKeyHint="done"
            value={confirmation}
            error={errors.confirmation && copy.confirmationErrors[errors.confirmation]}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        {failure && <Callout tone="danger">{failure}</Callout>}
      </StepTransition>
      <ScreenFooter>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={pending}
          disabled={password.length === 0 || confirmation.length === 0}
        >
          {copy.submit}
        </Button>
      </ScreenFooter>
    </form>
  );
}
