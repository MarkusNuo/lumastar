export interface FlameProps {
  /** Burning in the streak colours; grey while today's goal is still open. */
  lit: boolean;
  className?: string;
}

/** Lingora's own streak flame: an outer tongue with a hot core. */
export function Flame({ lit, className }: FlameProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path
        className={lit ? 'fill-streak' : 'fill-locked'}
        d="M12.6 1.8c.6 3 3 4.8 4.7 7.2 1.9 2.7 2.4 6 1 8.8-1.3 2.7-4 4.4-6.9 4.4-3.6 0-6.6-2.6-7-6.2-.3-2.6.8-5 2.6-6.8.1 1.6.8 2.8 2 3.5-.4-4 .9-8 3.6-10.9Z"
      />
      <path
        className={lit ? 'fill-streak-core' : 'fill-on-locked'}
        d="M12.4 11.6c.9 1.7 3.1 2.8 3.1 5.3 0 1.9-1.5 3.5-3.4 3.5s-3.5-1.5-3.5-3.4c0-1.4.7-2.5 1.7-3.2.1 1 .6 1.7 1.3 2-.1-1.6.1-3 .8-4.2Z"
      />
    </svg>
  );
}
