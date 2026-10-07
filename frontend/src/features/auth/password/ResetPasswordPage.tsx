import { CheckIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { ButtonLink } from '../../../components/ui/ButtonLink';
import { Callout } from '../../../components/ui/Callout';
import { PasswordField } from '../../../components/ui/PasswordField';
import { celebrate } from '../../../lib/celebrate';
import { moveToNextFieldOnEnter } from '../../../lib/moveToNextField';
import { useFormErrors } from '../../../lib/useFormErrors';
import { useOnceWhen } from '../../../lib/useOnceWhen';
import { validateConfirmation, validateNewPassword } from '../accountRules';
import { useAuthStatus } from '../authHooks';
import { invalidFields, linkProblem, useThrottleLock, type LinkProblem } from '../authProblems';
import { AUTH_ROUTES } from '../authRoutes';
import { AuthIntro, AuthMessage, AuthScreen } from '../AuthScreen';
import { AUTH_COPY, FIELD_COPY } from '../copy';
import { useResetPassword } from './passwordApi';

const copy = AUTH_COPY.resetPassword;

/** Route `/reset-password?token=…` from the reset mail; it works with and without a session. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const reset = useResetPassword();
  const [problem, setProblem] = useState<LinkProblem | undefined>(token ? undefined : 'invalid');

  if (problem) return <ResetLinkProblem problem={problem} />;
  if (reset.isSuccess) return <PasswordChanged />;
  return (
    <NewPasswordForm
      onSubmit={(newPassword, onRefused) => {
        if (!token) return;
        reset.mutate(
          { token, newPassword },
          {
            onError: (error) => {
              const link = linkProblem(error);
              if (link) setProblem(link);
              else onRefused(error);
            },
          },
        );
      }}
      pending={reset.isPending}
    />
  );
}

interface NewPasswordFormProps {
  /** `onRefused` receives every error that is not about the link itself. */
  onSubmit: (newPassword: string, onRefused: (error: unknown) => void) => void;
  pending: boolean;
}

function NewPasswordForm({ onSubmit, pending }: NewPasswordFormProps) {
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [failed, setFailed] = useState(false);
  const throttle = useThrottleLock();
  const passwordError = validateNewPassword(password);
  const confirmationError = validateConfirmation(password, confirmation);
  const [formRef, form] = useFormErrors({
    password: passwordError && FIELD_COPY.newPassword.errors[passwordError],
    confirmation: confirmationError && FIELD_COPY.confirmation.errors[confirmationError],
  });

  useEffect(() => inputRef.current?.focus(), []);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (pending || throttle.locked || !form.check()) return;
    setFailed(false);
    onSubmit(password, (error) => {
      if (throttle.lockOn(error)) form.shake();
      else if (invalidFields(error).length > 0) {
        form.rejectFields({ password: AUTH_COPY.register.refused.password });
      } else setFailed(true);
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
          icon={throttle.locked ? undefined : CheckIcon}
          loading={pending}
          disabled={throttle.locked}
        >
          {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
        </Button>
      }
    >
      <AuthIntro
        expression={pending ? 'thinking' : 'encouraging'}
        title={copy.title}
        text={copy.text}
        compact
      />
      <form ref={formRef} id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <PasswordField
          ref={inputRef}
          label={copy.newPasswordLabel}
          hint={FIELD_COPY.newPassword.hint}
          autoComplete="new-password"
          enterKeyHint="next"
          value={password}
          error={form.errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            form.clear('password');
          }}
          onKeyDown={moveToNextFieldOnEnter}
        />
        <PasswordField
          label={FIELD_COPY.confirmation.label}
          autoComplete="new-password"
          enterKeyHint="done"
          value={confirmation}
          error={form.errors.confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        {throttle.locked && <Callout tone="warning">{AUTH_COPY.register.throttled}</Callout>}
        {failed && <Callout tone="danger">{copy.failed}</Callout>}
      </form>
    </AuthScreen>
  );
}

function PasswordChanged() {
  const status = useAuthStatus();
  const signedIn = status.data?.authenticated === true;

  useOnceWhen(true, celebrate);

  return (
    <AuthMessage
      expression="celebrating"
      title={copy.done.title}
      text={copy.done.text}
      action={
        <ButtonLink to={signedIn ? '/' : AUTH_ROUTES.login} size="lg" fullWidth>
          {signedIn ? copy.toApp : copy.toLogin}
        </ButtonLink>
      }
    />
  );
}

function ResetLinkProblem({ problem }: { problem: LinkProblem }) {
  const message = AUTH_COPY.link[problem];
  return (
    <AuthMessage
      backTo={AUTH_ROUTES.login}
      expression="encouraging"
      title={message.title}
      text={`${message.text} ${AUTH_COPY.resetPassword.requestNewHint}`}
      action={
        <ButtonLink to={AUTH_ROUTES.forgotPassword} size="lg" fullWidth>
          {copy.requestNew}
        </ButtonLink>
      }
    />
  );
}
