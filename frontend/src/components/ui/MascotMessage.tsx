import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Mascot, type MascotExpression } from './Mascot';

export interface MascotMessageProps {
  expression?: MascotExpression;
  /** The mascot's words; pass a heading when the message is the screen's question. */
  children: ReactNode;
  className?: string;
}

/** The mascot speaking through a speech bubble, e.g. to ask the question of a setup step. */
export function MascotMessage({ expression = 'happy', children, className }: MascotMessageProps) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <Mascot expression={expression} size="md" />
      <div className="relative min-w-0 flex-1 rounded-card border-2 border-border bg-surface px-4 py-3 text-lead font-extrabold text-fg">
        <span
          aria-hidden="true"
          className="absolute top-1/2 -left-[7px] size-3 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-border bg-surface"
        />
        {children}
      </div>
    </div>
  );
}
