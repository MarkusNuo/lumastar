import { cx } from '../../lib/cx';

const DOT_DELAYS = ['[animation-delay:0ms]', '[animation-delay:120ms]', '[animation-delay:240ms]'];

export function LoadingDots({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('inline-flex items-center gap-1', className)}>
      {DOT_DELAYS.map((delay) => (
        <span key={delay} className={cx('size-2 animate-dot rounded-full bg-current', delay)} />
      ))}
    </span>
  );
}
