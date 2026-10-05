import { ArrowsClockwiseIcon, ChartBarIcon, PathIcon, UserCircleIcon } from '@phosphor-icons/react';
import type { NavItem } from '../components/ui/BottomNav';
import { REVIEW_ROUTES } from '../features/review/reviewRoutes';
import { APP_COPY } from './copy';

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Lernen', icon: PathIcon, end: true },
  { to: REVIEW_ROUTES.home, label: 'Wiederholen', icon: ArrowsClockwiseIcon },
  { to: '/statistik', label: 'Statistik', icon: ChartBarIcon },
  { to: '/profil', label: 'Profil', icon: UserCircleIcon },
];

/** The navigation with the number of due reviews on the "Wiederholen" tab, if any. */
export function navItems(dueReviews: number): readonly NavItem[] {
  if (dueReviews <= 0) return NAV_ITEMS;
  return NAV_ITEMS.map((item) =>
    item.to === REVIEW_ROUTES.home
      ? { ...item, badge: { count: dueReviews, description: APP_COPY.reviewsDue(dueReviews) } }
      : item,
  );
}
