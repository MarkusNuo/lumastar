import type { Icon } from '@phosphor-icons/react';
import { NavLink } from 'react-router';
import { cx } from '../../lib/cx';
import { UI_COPY } from './copy';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  /** Only active on an exact match (needed for the index route "/"). */
  end?: boolean;
}

export interface BottomNavProps {
  items: readonly NavItem[];
  label?: string;
  className?: string;
}

export function BottomNav({ items, label = UI_COPY.bottomNav, className }: BottomNavProps) {
  return (
    <nav aria-label={label} className={cx('border-t-2 border-border bg-bg', className)}>
      <ul className="flex h-(--spacing-nav) items-stretch px-2">
        {items.map((item) => (
          <li key={item.to} className="flex flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className="group flex flex-1 flex-col items-center justify-center gap-0.5 rounded-card-sm"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'grid h-9 w-14 place-items-center rounded-button border-2 transition-colors duration-(--duration-fast)',
                      isActive
                        ? 'border-primary bg-primary-surface text-primary-soft'
                        : 'border-transparent text-fg-subtle group-hover:text-fg-muted',
                    )}
                  >
                    <item.icon aria-hidden="true" size={24} weight={isActive ? 'fill' : 'bold'} />
                  </span>
                  <span
                    className={cx(
                      'text-micro font-extrabold tracking-wide uppercase',
                      isActive ? 'text-primary-soft' : 'text-fg-subtle',
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
