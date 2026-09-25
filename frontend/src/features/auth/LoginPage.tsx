import { SignInIcon } from '@phosphor-icons/react';
import { useId, useRef, useState, type SubmitEvent } from 'react';
import { isApiError } from '../../api/ApiError';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { Mascot, type MascotExpression } from '../../components/ui/Mascot';
import { PasswordField } from '../../components/ui/PasswordField';
import { Wordmark } from '../../components/ui/Wordmark';
import { useShake } from '../../lib/useShake';
import { useLogin } from './authHooks';
import { AUTH_COPY } from './copy';
import { formatCountdown, useCountdown } from './useCountdown';

const copy = AUTH_COPY.login;

// Used only if a throttled answer lacks retryAfterSeconds; matches the backend's first lock.
const FALLBACK_LOCK_SECONDS = 60;

export function LoginPage() {
  const login = useLogin();
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [shakeScope, shake] = useShake();
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [lockSeconds, startLock] = useCountdown();
  const locked = lockSeconds > 0;

  const rejectAttempt = (message: string) => {
    setFieldError(message);
    shake();
    inputRef.current?.select();
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (locked || login.isPending) return;
    if (!password) {
      rejectAttempt(copy.empty);
      inputRef.current?.focus();
      return;
    }
    setFieldError(undefined);
    setFailed(false);
    login.mutate(password, {
      onError: (error) => {
        if (isApiError(error, 'invalid_credentials')) {
          rejectAttempt(copy.wrongPassword);
        } else if (isApiError(error, 'login_throttled')) {
          startLock(error.problem?.retryAfterSeconds ?? FALLBACK_LOCK_SECONDS);
          shake();
        } else {
          setFailed(true);
        }
      },
    });
  };

  const expression: MascotExpression = login.isPending
    ? 'thinking'
    : fieldError || locked
      ? 'encouraging'
      : 'happy';

  return (
    <FocusScreen
      backdrop
      header={<Wordmark size="sm" className="mx-auto" />}
      className="justify-center gap-6 pb-6"
      footer={
        <Button
          type="submit"
          form={formId}
          variant="primary"
          size="lg"
          fullWidth
          icon={locked ? undefined : SignInIcon}
          loading={login.isPending}
          disabled={locked}
        >
          {locked ? copy.wait(formatCountdown(lockSeconds)) : copy.submit}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Mascot expression={expression} size="xl" />
        <h1 className="text-headline font-black">{copy.title}</h1>
        <p className="max-w-xs text-body text-fg-muted">{copy.text}</p>
      </div>
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div ref={shakeScope}>
          <PasswordField
            ref={inputRef}
            label={copy.passwordLabel}
            autoComplete="current-password"
            value={password}
            error={fieldError}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldError(undefined);
            }}
          />
        </div>
        {locked && <Callout tone="warning">{copy.throttled}</Callout>}
        {failed && <Callout tone="danger">{copy.failed}</Callout>}
      </form>
    </FocusScreen>
  );
}
