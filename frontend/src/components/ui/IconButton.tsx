import type { Icon, IconWeight } from '@phosphor-icons/react';
import type { ComponentPropsWithRef } from 'react';
import { cx } from '../../lib/cx';
import {
  buttonTone,
  buttonVariantClass,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles';

export interface IconButtonProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'aria-label'
> {
  icon: Icon;
  /** Accessible name; icon buttons have no visible text. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: 'rounded' | 'circle';
  iconWeight?: IconWeight;
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'size-10 rounded-button-sm',
  md: 'size-12 rounded-button',
  lg: 'size-14 rounded-button-lg',
};

const iconSize: Record<ButtonSize, number> = { sm: 20, md: 24, lg: 28 };

export function IconButton({
  icon: IconComponent,
  label,
  variant = 'neutral',
  size = 'md',
  shape = 'rounded',
  iconWeight = 'bold',
  disabled = false,
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-label={label}
      data-tone={buttonTone(variant, disabled)}
      className={cx(
        'inline-grid shrink-0 place-items-center',
        sizeClass[size],
        shape === 'circle' && 'rounded-full',
        buttonVariantClass[variant],
        className,
      )}
    >
      <IconComponent aria-hidden="true" size={iconSize[size]} weight={iconWeight} />
    </button>
  );
}
