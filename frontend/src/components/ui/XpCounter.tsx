import { LightningIcon } from '@phosphor-icons/react';
import { cx } from '../../lib/cx';
import { PopNumber } from './PopNumber';

export interface XpCounterProps {
  xp: number;
  className?: string;
}

export function XpCounter({ xp, className }: XpCounterProps) {
  return (
    <span className={cx('inline-flex items-center gap-1', className)}>
      <LightningIcon aria-hidden="true" size={26} weight="fill" className="text-xp" />
      <PopNumber value={xp} className="text-lead font-black text-xp tabular-nums" />
      <span className="sr-only">{xp} XP</span>
    </span>
  );
}
