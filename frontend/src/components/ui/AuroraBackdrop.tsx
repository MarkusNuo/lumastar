import { cx } from '../../lib/cx';

/** Decorative glows in the brand colours; the parent needs `relative isolate`. */
export function AuroraBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
    >
      <div className="absolute -top-24 -left-24 size-72 rounded-full bg-primary/25 blur-glow" />
      <div className="absolute top-1/3 -right-28 size-72 rounded-full bg-secondary/15 blur-glow" />
    </div>
  );
}
