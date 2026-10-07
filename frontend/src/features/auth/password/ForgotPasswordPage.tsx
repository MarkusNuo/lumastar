import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { useId, useState, type SubmitEvent } from 'react';
import { useLocation } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { ButtonLink } from '../../../components/ui/ButtonLink';
import { Callout } from '../../../components/ui/Callout';
import { TextField } from '../../../components/ui/TextField';
import { useFormErrors } from '../../../lib/useFormErrors';
import { normalize, validateEmail } from '../accountRules';
import { useSignedIn } from '../authHooks';
import { rejectInvalid, useThrottleLock, type ServerFields } from '../authProblems';
import { AUTH_ROUTES } from '../authRoutes';
import { AuthIntro, AuthMessage, AuthScreen } from '../AuthScreen';
import { AUTH_COPY, FIELD_COPY } from '../copy';
import { useRequestPasswordReset } from './passwordApi';

const copy = AUTH_COPY.forgotPassword;

const SERVER_FIELDS: ServerFields<'email'> = {
  email: ['email', FIELD_COPY.email.errors.invalid],
};

/** Router state from the sign-in, so the address typed there is not asked for again. */
export interface ForgotPasswordState {
  email?: string;
}

function initialEmail(state: unknown): string {
  return (state as ForgotPasswordState | null)?.email ?? '';
}

/**
 * Route `/passwort-vergessen`: requests a link for a new password. It needs no session, but a
 * signed-in learner whose reset link expired gets here too; the way on then leads into the app.
 */
export function ForgotPasswordPage() {
  const location = useLocation();
  const signedIn = useSignedIn();
  const onward = signedIn
    ? { to: '/', label: copy.toApp }
    : { to: AUTH_ROUTES.login, label: copy.toLogin };
  const request = useRequestPasswordReset();
  const formId = useId();
  const [email, setEmail] = useState(() => initialEmail(location.state));
  const [failure, setFailure] = useState<string>();
  const throttle = useThrottleLock();
  const emailError = validateEmail(email);
  const [formRef, form] = useFormErrors({
    email: emailError && FIELD_COPY.email.errors[emailError],
  });

  if (request.isSuccess) {
    return (
      <AuthMessage
        backTo={onward.to}
        expression="happy"
        title={copy.sent.title}
        text={copy.sent.text(request.variables)}
        action={
          <ButtonLink to={onward.to} size="lg" fullWidth>
            {onward.label}
          </ButtonLink>
        }
      />
    );
  }

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (throttle.locked || request.isPending || !form.check()) return;
    setFailure(undefined);
    request.mutate(normalize(email), {
      onError: (error) => {
        if (throttle.lockOn(error)) form.shake();
        else if (!rejectInvalid(error, SERVER_FIELDS, form, setFailure)) setFailure(copy.failed);
      },
    });
  };

  return (
    <AuthScreen
      backTo={onward.to}
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
          onChange={(event) => {
            setEmail(event.target.value);
            form.clear('email');
          }}
        />
        {throttle.locked && <Callout tone="warning">{copy.throttled}</Callout>}
        {failure && <Callout tone="danger">{failure}</Callout>}
      </form>
    </AuthScreen>
  );
}
