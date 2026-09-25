import { Outlet } from 'react-router';
import { BottomNav } from '../components/ui/BottomNav';
import { useMe } from '../features/auth/authHooks';
import { topBarStats } from './learnerStats';
import { NAV_ITEMS } from './navigation';
import { TopBar } from './TopBar';

export function AppShell() {
  const me = useMe();

  return (
    <div className="mx-auto flex min-h-dvh max-w-app flex-col">
      <TopBar {...topBarStats(me.data)} />
      <main className="flex-1 px-gutter pb-[calc(var(--spacing-nav)+var(--safe-bottom)+2rem)]">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-(--z-bar) bg-bg pb-(--safe-bottom)">
        <BottomNav items={NAV_ITEMS} className="mx-auto max-w-app" />
      </div>
    </div>
  );
}
