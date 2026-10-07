import type { Icon } from '@phosphor-icons/react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '../../lib/cx';
import { buttonClass, buttonTone, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: Icon;
}

const iconSize: Record<ButtonSize, number> = { sm: 16, md: 20, lg: 22 };

/** A link to another screen that looks like a 3D button, e.g. "Konto erstellen". */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon: IconComponent,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      {...rest}
      data-tone={buttonTone(variant, false)}
      data-variant={variant}
      className={cx(buttonClass(variant, size), fullWidth && 'w-full', className)}
    >
      {IconComponent && <IconComponent aria-hidden="true" size={iconSize[size]} weight="bold" />}
      {children}
    </Link>
  );
}
