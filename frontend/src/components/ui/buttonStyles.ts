import { cx } from '../../lib/cx';
import type { Tone } from './tones';

export const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'neutral',
  'ghost',
  'locked',
] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonSize = 'sm' | 'md' | 'lg';

const solid = 'pressable tone-solid';

const buttonSizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-10 gap-1.5 rounded-button-sm px-4 text-caption',
  md: 'min-h-12 gap-2 rounded-button px-5 text-label',
  lg: 'min-h-14 gap-2.5 rounded-button-lg px-6 text-body',
};

export const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: solid,
  secondary: solid,
  success: solid,
  danger: solid,
  warning: solid,
  locked: solid,
  neutral: 'pressable tone-outline disabled:text-fg-subtle',
  ghost:
    'text-fg-muted transition-colors duration-(--duration-fast) hover:bg-surface hover:text-fg active:bg-surface-raised disabled:bg-transparent disabled:text-fg-subtle',
};

const variantTone: Record<ButtonVariant, Tone | undefined> = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  locked: 'locked',
  neutral: 'neutral',
  ghost: undefined,
};

/** Disabled solid buttons turn grey like locked ones; outline and ghost keep their tone. */
export function buttonTone(variant: ButtonVariant, disabled: boolean): Tone | undefined {
  if (disabled && variant !== 'neutral' && variant !== 'ghost') return 'locked';
  return variantTone[variant];
}

/** Full class list of a text button; also used for links that look like buttons. */
export function buttonClass(variant: ButtonVariant, size: ButtonSize): string {
  return cx(
    'relative inline-flex items-center justify-center font-extrabold tracking-wide uppercase select-none',
    buttonSizeClass[size],
    buttonVariantClass[variant],
  );
}
