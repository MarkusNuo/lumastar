import { XIcon, type Icon } from '@phosphor-icons/react';
import { useId, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { UI_COPY } from './copy';
import { IconButton } from './IconButton';
import type { Tone } from './tones';

export interface BannerProps {
  tone: Tone;
  icon: Icon;
  title: string;
  children?: ReactNode;
  /** A button below the text, e.g. "Link erneut senden". */
  action?: ReactNode;
  /** Shows a close button; the banner itself decides how long it stays hidden. */
  onDismiss?: () => void;
  className?: string;
}

/** A standing notice above the content that asks for something, e.g. to confirm the e-mail. */
export function Banner({
  tone,
  icon: BannerIcon,
  title,
  children,
  action,
  onDismiss,
  className,
}: BannerProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      data-tone={tone}
      className={cx('flex gap-3 rounded-card tone-outline p-3 pr-2', className)}
    >
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-button tone-solid edge-3d"
      >
        <BannerIcon size={24} weight="bold" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
        <div className="text-fg">
          <p id={titleId} className="text-body font-black">
            {title}
          </p>
          {children && (
            <div className="text-caption font-bold wrap-break-word text-fg-muted">{children}</div>
          )}
        </div>
        {action && <div className="flex">{action}</div>}
      </div>
      {onDismiss && (
        <IconButton
          icon={XIcon}
          label={UI_COPY.banner.dismiss}
          variant="ghost"
          size="sm"
          className="-mt-1"
          onClick={onDismiss}
        />
      )}
    </section>
  );
}
