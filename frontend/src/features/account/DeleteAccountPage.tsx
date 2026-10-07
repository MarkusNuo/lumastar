import { DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Mascot } from '../../components/ui/Mascot';
import { PasswordField } from '../../components/ui/PasswordField';
import { showToast } from '../../components/ui/toastStore';
import { useFormErrors } from '../../lib/useFormErrors';
import { validateCurrentPassword } from '../auth/accountRules';
import { useMe } from '../auth/authHooks';
import { useThrottleLock } from '../auth/authProblems';
import { AUTH_COPY, FIELD_COPY } from '../auth/copy';
import { PROFILE_COPY } from '../settings/copy';
import { useBackupDownload } from '../settings/useBackupDownload';
import { useDeleteAccount } from './accountApi';
import { isWrongPassword } from './accountProblems';
import { AccountScreen } from './AccountScreen';
import { ACCOUNT_COPY } from './copy';

const copy = ACCOUNT_COPY.delete;

/**
 * Route `/profil/konto-loeschen`: what gets lost, a backup first, the password and a last
 * confirmation; afterwards the guards lead to the welcome screen.
 */
export function DeleteAccountPage() {
  const email = useMe().data?.email;
  const remove = useDeleteAccount(() => showToast(copy.deleted, { tone: 'primary' }));
  const formId = useId();
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const throttle = useThrottleLock();
  const [formRef, form] = useFormErrors({
    password: validateCurrentPassword(password) && FIELD_COPY.currentPassword.required,
  });

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (remove.isPending || throttle.locked || !form.check()) return;
    setConfirming(true);
  };

  const deleteAccount = () => {
    setConfirming(false);
    setFailed(false);
    remove.mutate(password, {
      onError: (error) => {
        if (throttle.lockOn(error)) form.shake();
        else if (isWrongPassword(error)) {
          form.rejectFields({ password: FIELD_COPY.currentPassword.wrong });
        } else setFailed(true);
      },
    });
  };

  return (
    <AccountScreen
      title={copy.title}
      busy={remove.isPending}
      footer={
        <Button
          type="submit"
          form={formId}
          variant="danger"
          size="lg"
          fullWidth
          icon={throttle.locked ? undefined : TrashIcon}
          loading={remove.isPending}
          disabled={throttle.locked}
        >
          {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Mascot expression="sad" size="lg" />
        <h2 className="text-headline font-black">{copy.heading}</h2>
      </div>
      <Consequences />
      <BackupOffer />
      <form ref={formRef} id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <input type="email" autoComplete="username" value={email ?? ''} hidden readOnly />
        <PasswordField
          label={FIELD_COPY.currentPassword.label}
          hint={copy.passwordHint}
          autoComplete="current-password"
          enterKeyHint="done"
          value={password}
          error={form.errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            form.clear('password');
          }}
        />
        {throttle.locked && <Callout tone="warning">{AUTH_COPY.register.throttled}</Callout>}
        {failed && <Callout tone="danger">{copy.failed}</Callout>}
      </form>
      <ConfirmDialog
        open={confirming}
        title={copy.confirm.title}
        text={copy.confirm.text}
        cancelLabel={copy.confirm.cancel}
        confirmLabel={copy.confirm.confirm}
        onCancel={() => setConfirming(false)}
        onConfirm={deleteAccount}
      />
    </AccountScreen>
  );
}

function Consequences() {
  return (
    <section
      aria-label={copy.intro}
      data-tone="danger"
      className="flex flex-col gap-2 rounded-card tone-outline p-4 text-label font-bold"
    >
      <p className="text-fg">{copy.intro}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-fg-muted marker:text-danger">
        {copy.consequences.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="font-black text-danger">{copy.irreversible}</p>
    </section>
  );
}

/** Offered before anything is lost: the same ZIP backup as in "Lerndaten". */
function BackupOffer() {
  const download = useBackupDownload();

  return (
    <section
      aria-label={copy.backup.title}
      className="flex flex-col gap-3 rounded-card border-2 border-border bg-surface p-4"
    >
      <div>
        <p className="text-body font-black text-fg">{copy.backup.title}</p>
        <p className="text-label font-bold text-fg-muted">{copy.backup.text}</p>
      </div>
      <Button
        variant="secondary"
        icon={DownloadSimpleIcon}
        loading={download.isPending}
        onClick={download.download}
      >
        {copy.backup.button}
      </Button>
      {download.failed && <Callout tone="danger">{PROFILE_COPY.backup.downloadFailed}</Callout>}
    </section>
  );
}
