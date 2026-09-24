import { ArrowsClockwiseIcon, ChartBarIcon, PathIcon, UserCircleIcon } from '@phosphor-icons/react';
import type { NavItem } from '../components/ui/BottomNav';

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Lernen', icon: PathIcon, end: true },
  { to: '/wiederholen', label: 'Wiederholen', icon: ArrowsClockwiseIcon },
  { to: '/statistik', label: 'Statistik', icon: ChartBarIcon },
  { to: '/profil', label: 'Profil', icon: UserCircleIcon },
];
