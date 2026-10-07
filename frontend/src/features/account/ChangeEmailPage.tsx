import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { isApiError } from '../../api/ApiError';
import { Button } from '../../components/ui/Button';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Callout } from '../../components/ui/Callout';
import { PasswordField } from '../../components/ui/PasswordField';
import { TextField } from '../../components/ui/TextField';
import { moveToNextFieldOnEnter } from '../../lib/moveToNextField';
import { useFormErrors } from '../../lib/useFormErrors';
import { normalize, validateCurrentPassword, validateEmail } from '../auth/accountRules';
import { invalidFields, useThrottleLock } from '../auth/authProblems';
import { AUTH_COPY, FIELD_COPY } from '../auth/copy';
import type { Account } from '../auth/interimApi';
import { accountQuery, useChangeEmail } from './accountApi';
import { isWrongPassword } from './accountProblems';
import { ACCOUNT_ROUTES } from './accountRoutes';
import { AccountMessage, AccountScreen, AccountScreenLoading } from './AccountScreen';
import { ACCOUNT_COPY } from './copy';
import { EmailStatusChip } from './EmailStatusChip';
import { ResendButton } from './verification/ResendButton';

const copy = ACCOUNT_COPY.email;

/** Route `/profil/e-mail`: the address, its confirmation and a change to a new one. */
export function ChangeEmailPage() {
  const account = useQuery(accountQuery);
  const change = useChangeEmail();

  if (change.isSuccess) return <EmailChanged account={change.data} />;
  if (!account.data) return <AccountScreenLoading title={copy.title} query={account} />;
  return <EmailForm account={account.data} change={change} />;
}

/** What the change did: a link to the new address, a replaced address or a cancelled change. */
function changeOutcome({ email, emailVerified, pendingEmail }: Account) {
  if (pendingEmail)
    return { heading: copy.pendingSent.title, text: copy.pendingSent.text(pendingEmail) };
  // A confirmed address only stays without a pending change when the change was cancelled.
  if (emailVerified)
    return { heading: copy.cancelled.title, text: copy.cancelled.text(email ?? '') };
  return { heading: copy.replaced.title, text: copy.replaced.text(email ?? '') };
}

function EmailChanged({ account }: { account: Account }) {
  return (
    <AccountMessage
      title={copy.title}
      expression="happy"
      {...changeOutcome(account)}
      action={
        <ButtonLink to={ACCOUNT_ROUTES.profile} size="lg" fullWidth>
          {copy.done}
        </ButtonLink>
      }
    />
  );
}

function CurrentAddress({ account }: { account: Account }) {
  return (
    <section
      aria-label={copy.current}
      className="flex flex-col gap-3 rounded-card border-2 border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-caption font-extrabold tracking-wider text-fg-muted uppercase">
          {copy.current}
        </p>
        <p className="text-body font-extrabold wrap-anywhere text-fg">
          {account.email ?? copy.none}
        </p>
        <span className="flex">
          <EmailStatusChip account={account} />
        </span>
      </div>
      {account.email && !account.emailVerified && !account.pendingEmail && <ResendButton />}
      {account.pendingEmail && (
        <div className="flex flex-col gap-2 text-label font-bold">
          <p className="wrap-anywhere text-fg">{copy.pending(account.pendingEmail)}</p>
          <p className="text-fg-muted">
            {copy.pendingHint} {copy.cancelHint}
          </p>
          <ResendButton />
        </div>
      )}
    </section>
  );
}

interface EmailFormProps {
  account: Account;
  change: ReturnType<typeof useChangeEmail>;
}

function EmailForm({ account, change }: EmailFormProps) {
  const formId = useId();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<string>();
  const throttle = useThrottleLock();
  const emailError = validateEmail(newEmail);
  // With a change pending, the current address is how to cancel it.
  const same =
    emailError === undefined &&
    !account.pendingEmail &&
    normalize(newEmail).toLowerCase() === account.email?.toLowerCase();
  const [formRef, form] = useFormErrors({
    newEmail: emailError ? FIELD_COPY.email.errors[emailError] : same ? copy.same : undefined,
    password: validateCurrentPassword(password) && FIELD_COPY.currentPassword.required,
  });

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (change.isPending || throttle.locked || !form.check()) return;
    setFailure(undefined);
    change.mutate(
      { newEmail: normalize(newEmail), password },
      {
        onError: (error) => {
          if (throttle.lockOn(error)) form.shake();
          else if (isWrongPassword(error)) {
            form.rejectFields({ password: FIELD_COPY.currentPassword.wrong });
          } else if (isApiError(error, 'email_taken')) form.rejectFields({ newEmail: copy.taken });
          else if (invalidFields(error).length > 0) {
            form.rejectFields({ newEmail: FIELD_COPY.email.errors.invalid });
          } else setFailure(copy.failed);
        },
      },
    );
  };

  return (
    <AccountScreen
      title={copy.title}
      busy={change.isPending}
      footer={
        <Button
          type="submit"
          form={formId}
          size="lg"
          fullWidth
          icon={throttle.locked ? undefined : PaperPlaneTiltIcon}
          loading={change.isPending}
          disabled={throttle.locked}
        >
          {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
        </Button>
      }
    >
      <CurrentAddress account={account} />
      <form
        ref={formRef}
        id={formId}
        noValidate
        onSubmit={submit}
        aria-labelledby={`${formId}-title`}
        className="flex flex-col gap-5"
      >
        <h2 id={`${formId}-title`} className="text-title font-black">
          {copy.change}
        </h2>
        <TextField
          label={copy.newLabel}
          placeholder={FIELD_COPY.email.placeholder}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          value={newEmail}
          error={form.errors.newEmail}
          onChange={(event) => {
            setNewEmail(event.target.value);
            form.clear('newEmail');
          }}
          onKeyDown={moveToNextFieldOnEnter}
        />
        <PasswordField
          label={FIELD_COPY.currentPassword.label}
          hint={copy.passwordHint}
          autoComplete="current-password"
          enterKeyHint="send"
          value={password}
          error={form.errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            form.clear('password');
          }}
        />
        {throttle.locked && <Callout tone="warning">{AUTH_COPY.register.throttled}</Callout>}
        {failure && <Callout tone="danger">{failure}</Callout>}
      </form>
    </AccountScreen>
  );
}
