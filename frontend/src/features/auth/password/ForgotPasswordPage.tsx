import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { useId, useState, type SubmitEvent } from 'react';
import { useLocation } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { ButtonLink } from '../../../components/ui/ButtonLink';
import { Callout } from '../../../components/ui/Callout';
import { TextField } from '../../../components/ui/TextField';
import { useFormErrors } from '../../../lib/useFormErrors';
import { normalize, validateEmail } from '../accountRules';
import { useThrottleLock } from '../authProblems';
import { AUTH_ROUTES } from '../authRoutes';
import { AuthIntro, AuthMessage, AuthScreen } from '../AuthScreen';
import { AUTH_COPY, FIELD_COPY } from '../copy';
import { useRequestPasswordReset } from './passwordApi';

const copy = AUTH_COPY.forgotPassword;

/** Router state from the sign-in, so the address typed there is not asked for again. */
export interface ForgotPasswordState {
  email?: string;
}

function initialEmail(state: unknown): string {
  return (state as ForgotPasswordState | null)?.email ?? '';
}

/** Route `/passwort-vergessen`: requests a link for a new password. */
export function ForgotPasswordPage() {
  const location = useLocation();
  const request = useRequestPasswordReset();
  const formId = useId();
  const [email, setEmail] = useState(() => initialEmail(location.state));
  const [failed, setFailed] = useState(false);
  const throttle = useThrottleLock();
  const emailError = validateEmail(email);
  const [formRef, form] = useFormErrors({
    email: emailError && FIELD_COPY.email.errors[emailError],
  });

  if (request.isSuccess) {
    return (
      <AuthMessage
        backTo={AUTH_ROUTES.login}
        expression="happy"
        title={copy.sent.title}
        text={copy.sent.text(request.variables)}
        action={
          <ButtonLink to={AUTH_ROUTES.login} size="lg" fullWidth>
            {copy.toLogin}
          </ButtonLink>
        }
      />
    );
  }

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (throttle.locked || request.isPending || !form.check()) return;
    setFailed(false);
    request.mutate(normalize(email), {
      onError: (error) => {
        if (throttle.lockOn(error)) form.shake();
        else setFailed(true);
      },
    });
  };

  return (
    <AuthScreen
      backTo={AUTH_ROUTES.login}
      footer={
        <Button
          type="submit"
          form={formId}
          variant="primary"
          size="lg"
          fullWidth
          icon={throttle.locked ? undefined : PaperPlaneTiltIcon}
          loading={request.isPending}
          disabled={throttle.locked}
        >
          {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
        </Button>
      }
    >
      <AuthIntro
        expression={request.isPending ? 'thinking' : 'encouraging'}
        title={copy.title}
        text={copy.text}
      />
      <form ref={formRef} id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label={FIELD_COPY.email.label}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          value={email}
          hint={copy.hint}
          error={form.errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {throttle.locked && <Callout tone="warning">{copy.throttled}</Callout>}
        {failed && <Callout tone="danger">{copy.failed}</Callout>}
      </form>
    </AuthScreen>
  );
}
