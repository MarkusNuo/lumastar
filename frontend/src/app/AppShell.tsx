import { useQuery } from '@tanstack/react-query';
import { Outlet, ScrollRestoration } from 'react-router';
import { BottomNav } from '../components/ui/BottomNav';
import { useMe } from '../features/auth/authHooks';
import { reviewSummaryQuery } from '../features/review/reviewApi';
import { topBarStats } from './learnerStats';
import { navItems } from './navigation';
import { TopBar } from './TopBar';

export function AppShell() {
  const me = useMe();
  const review = useQuery(reviewSummaryQuery);

  return (
    <div className="mx-auto flex min-h-dvh max-w-app flex-col">
      <TopBar {...topBarStats(me.data)} />
      <main className="flex-1 px-gutter pb-[calc(var(--spacing-nav)+var(--safe-bottom)+2rem)]">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-(--z-bar) bg-bg pb-(--safe-bottom)">
        <BottomNav items={navItems(review.data?.dueNow ?? 0)} className="mx-auto max-w-app" />
      </div>
      {/* A new tab starts at the top instead of at the scroll position of the previous one. */}
      <ScrollRestoration />
    </div>
  );
}
