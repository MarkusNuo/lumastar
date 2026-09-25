import { cx } from '../../lib/cx';

export interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = { sm: 'text-lead', md: 'text-title', lg: 'text-display' } as const;

/** The Lingora name set in the aurora gradient of the mascot. */
export function Wordmark({ size = 'md', className }: WordmarkProps) {
  return (
    <span
      className={cx(
        'inline-block bg-linear-to-r from-secondary to-primary-soft bg-clip-text font-black tracking-tight text-transparent',
        sizeClass[size],
        className,
      )}
    >
      Lingora
    </span>
  );
}
