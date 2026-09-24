import type { Icon } from '@phosphor-icons/react';
import type { ComponentPropsWithRef, MouseEvent } from 'react';
import { cx } from '../../lib/cx';
import { buttonClass, buttonTone, type ButtonSize, type ButtonVariant } from './buttonStyles';
import { LoadingDots } from './LoadingDots';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows animated dots and ignores clicks while keeping focus and colour. */
  loading?: boolean;
  icon?: Icon;
}

const iconSize: Record<ButtonSize, number> = { sm: 16, md: 20, lg: 22 };

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon: IconComponent,
  disabled = false,
  type = 'button',
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) return;
    onClick?.(event);
  };

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-tone={buttonTone(variant, disabled)}
      data-variant={variant}
      onClick={handleClick}
      className={cx(buttonClass(variant, size), fullWidth && 'w-full', className)}
    >
      <span className={cx('inline-flex items-center gap-[inherit]', loading && 'invisible')}>
        {IconComponent && <IconComponent aria-hidden="true" size={iconSize[size]} weight="bold" />}
        {children}
      </span>
      {loading && <LoadingDots className="absolute" />}
    </button>
  );
}
