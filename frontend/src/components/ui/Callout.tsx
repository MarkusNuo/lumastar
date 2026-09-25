import { HourglassMediumIcon, WarningCircleIcon, type Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type CalloutTone = 'danger' | 'warning';

export interface CalloutProps {
  tone: CalloutTone;
  children: ReactNode;
  className?: string;
}

const toneIcon: Record<CalloutTone, Icon> = {
  danger: WarningCircleIcon,
  warning: HourglassMediumIcon,
};

/** Inline message that is announced when it appears, e.g. a failed request. */
export function Callout({ tone, children, className }: CalloutProps) {
  const ToneIcon = toneIcon[tone];

  return (
    <div
      role="alert"
      data-tone={tone}
      className={cx(
        'flex items-start gap-3 rounded-card-sm tone-outline px-4 py-3 text-label font-bold',
        className,
      )}
    >
      <ToneIcon aria-hidden="true" size={22} weight="bold" className="shrink-0 text-tone-text" />
      <p className="min-w-0 text-fg">{children}</p>
    </div>
  );
}
