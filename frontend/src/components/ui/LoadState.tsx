import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { cx } from '../../lib/cx';
import { Button } from './Button';
import { Callout } from './Callout';
import { UI_COPY } from './copy';
import { LoadingDots } from './LoadingDots';

export interface LoadingBlockProps {
  /** Announced to screen readers, e.g. "Profil wird geladen". */
  label: string;
  /** Sets the height the content will take, so the layout does not jump. */
  className?: string;
}

/** Placeholder while server data loads. */
export function LoadingBlock({ label, className }: LoadingBlockProps) {
  return (
    <div role="status" className={cx('grid place-items-center text-primary-soft', className)}>
      <LoadingDots />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export interface LoadFailedProps {
  message: string;
  onRetry: () => void;
  /** The retry is running. */
  retrying: boolean;
}

/** Failed request with a way to try again. */
export function LoadFailed({ message, onRetry, retrying }: LoadFailedProps) {
  return (
    <div className="flex flex-col gap-3">
      <Callout tone="danger">{message}</Callout>
      <Button variant="neutral" icon={ArrowClockwiseIcon} loading={retrying} onClick={onRetry}>
        {UI_COPY.retry}
      </Button>
    </div>
  );
}
