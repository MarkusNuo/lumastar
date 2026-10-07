import { SignInIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { isApiError } from '../../../api/ApiError';
import { Button } from '../../../components/ui/Button';
import { ButtonLink } from '../../../components/ui/ButtonLink';
import { Callout } from '../../../components/ui/Callout';
import { PasswordField } from '../../../components/ui/PasswordField';
import { useFormErrors } from '../../../lib/useFormErrors';
import { validateCurrentPassword } from '../accountRules';
import { useAuthStatus, useLegacyLogin } from '../authHooks';
import { useThrottleLock } from '../authProblems';
import { AUTH_ROUTES } from '../authRoutes';
import { AuthIntro, AuthMessage, AuthScreen } from '../AuthScreen';
import { AUTH_COPY, FIELD_COPY } from '../copy';

const copy = AUTH_COPY.legacyLogin;

/**
 * Route `/anmelden/frueheres-konto`: the account of the former single-user version signs in with
 * its password alone; the guards then ask for its e-mail address once.
 */
export function LegacyLoginPage() {
  const status = useAuthStatus();
  return status.data?.legacyLoginAvailable ? <LegacyLoginForm /> : <LegacyLoginUnavailable />;
}

function LegacyLoginForm() {
  const login = useLegacyLogin();
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
  const throttle = useThrottleLock();
  const [formRef, form] = useFormErrors({
    password: validateCurrentPassword(password) && FIELD_COPY.currentPassword.required,
  });

  useEffect(() => inputRef.current?.focus(), []);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (throttle.locked || login.isPending || !form.check()) return;
    setFailed(false);
    login.mutate(password, {
      onError: (error) => {
        if (throttle.lockOn(error)) form.shake();
        else if (isApiError(error, 'invalid_credentials')) {
          form.rejectFields({ password: FIELD_COPY.currentPassword.wrong });
        } else setFailed(true);
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
          icon={throttle.locked ? undefined : SignInIcon}
          loading={login.isPending}
          disabled={throttle.locked}
        >
          {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
        </Button>
      }
    >
      <AuthIntro
        expression={login.isPending ? 'thinking' : 'happy'}
        title={copy.title}
        text={copy.text}
      />
      <form ref={formRef} id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <PasswordField
          ref={inputRef}
          label={FIELD_COPY.currentPassword.label}
          autoComplete="current-password"
          enterKeyHint="go"
          value={password}
          error={form.errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            form.clear('password');
          }}
        />
        {throttle.locked && <Callout tone="warning">{AUTH_COPY.login.throttled}</Callout>}
        {failed && <Callout tone="danger">{AUTH_COPY.login.failed}</Callout>}
      </form>
    </AuthScreen>
  );
}

function LegacyLoginUnavailable() {
  return (
    <AuthMessage
      backTo={AUTH_ROUTES.login}
      expression="encouraging"
      title={copy.title}
      text={copy.unavailable}
      action={
        <ButtonLink to={AUTH_ROUTES.login} size="lg" fullWidth>
          {copy.toLogin}
        </ButtonLink>
      }
    />
  );
}
