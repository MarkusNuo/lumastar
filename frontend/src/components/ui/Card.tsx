import type { ComponentPropsWithRef } from 'react';
import { cx } from '../../lib/cx';

export type CardVariant = 'filled' | 'outline' | 'raised';

export interface CardProps extends ComponentPropsWithRef<'div'> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClass: Record<CardVariant, string> = {
  filled: 'bg-surface',
  outline: 'border-2 border-border',
  raised: 'border-2 border-border bg-surface edge-3d',
};

const paddingClass = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' } as const;

export function Card({ variant = 'filled', padding = 'md', className, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      data-tone={variant === 'raised' ? 'neutral' : undefined}
      className={cx('rounded-card', variantClass[variant], paddingClass[padding], className)}
    />
  );
}
