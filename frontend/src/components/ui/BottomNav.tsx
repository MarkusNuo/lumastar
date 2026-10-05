import type { Icon } from '@phosphor-icons/react';
import { useId } from 'react';
import { NavLink } from 'react-router';
import { cx } from '../../lib/cx';
import { UI_COPY } from './copy';

export interface NavBadge {
  count: number;
  /** Read after the tab name, e.g. "3 Wörter fällig"; the name itself stays the label. */
  description: string;
}

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  /** Only active on an exact match (needed for the index route "/"). */
  end?: boolean;
  /** A count on the icon, e.g. the reviews that are due. */
  badge?: NavBadge;
}

export interface BottomNavProps {
  items: readonly NavItem[];
  label?: string;
  className?: string;
}

/** More digits would not fit the pill. */
const MAX_BADGE_COUNT = 99;

export function BottomNav({ items, label = UI_COPY.bottomNav, className }: BottomNavProps) {
  return (
    <nav aria-label={label} className={cx('border-t-2 border-border bg-bg', className)}>
      <ul className="flex h-(--spacing-nav) items-stretch px-2">
        {items.map((item) => (
          <li key={item.to} className="flex flex-1">
            <BottomNavLink item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function BottomNavLink({ item }: { item: NavItem }) {
  const badgeId = useId();
  const { badge } = item;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-describedby={badge ? badgeId : undefined}
      className="group flex flex-1 flex-col items-center justify-center gap-0.5 rounded-card-sm"
    >
      {({ isActive }) => (
        <>
          <span
            className={cx(
              'relative grid h-9 w-14 place-items-center rounded-button border-2 transition-colors duration-(--duration-fast)',
              isActive
                ? 'border-primary bg-primary-surface text-primary-soft'
                : 'border-transparent text-fg-subtle group-hover:text-fg-muted',
            )}
          >
            <item.icon aria-hidden="true" size={24} weight={isActive ? 'fill' : 'bold'} />
            {badge && (
              <span
                aria-hidden="true"
                data-testid="nav-badge"
                className="absolute -top-2 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-bg bg-danger px-1 text-micro leading-none font-black text-on-danger tabular-nums"
              >
                {badge.count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : badge.count}
              </span>
            )}
          </span>
          <span
            className={cx(
              'text-micro font-extrabold tracking-wide uppercase',
              isActive ? 'text-primary-soft' : 'text-fg-subtle',
            )}
          >
            {item.label}
          </span>
          {badge && (
            <span id={badgeId} hidden>
              {badge.description}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
