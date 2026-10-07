import { UserCircleIcon } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { Sheet, SheetHeader } from '../../components/ui/Sheet';
import { LogoutButton } from '../account/LogoutButton';
import { useMe } from '../auth/authHooks';
import { ONBOARDING_COPY } from './copy';

const copy = ONBOARDING_COPY.account;

/**
 * Who is signed in, and the way out, while the onboarding and the first placement keep the learner
 * away from the app and its profile.
 */
export function AccountMenu({ className }: { className?: string }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <IconButton
        icon={UserCircleIcon}
        label={copy.open}
        variant="ghost"
        aria-haspopup="dialog"
        className={className}
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={close} aria-labelledby={titleId} className="flex flex-col gap-4">
        <SheetHeader titleId={titleId} title={copy.title} onClose={close} />
        <SignedInAs />
        <p className="text-body text-fg-muted">{copy.text}</p>
        <LogoutButton />
      </Sheet>
    </>
  );
}

function SignedInAs() {
  const me = useMe().data;
  if (!me) return null;
  return (
    <div className="flex flex-col gap-0.5 rounded-card border-2 border-border bg-bg p-4">
      <p className="text-body font-black wrap-anywhere text-fg">{me.displayName}</p>
      {me.email && <p className="text-label font-bold wrap-anywhere text-fg-muted">{me.email}</p>}
    </div>
  );
}
