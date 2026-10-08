import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useOnceWhen } from '../../lib/useOnceWhen';
import { isOpenScreenMessage } from '../../sw/messages';
import { ACCOUNT_ROUTES } from '../account/accountRoutes';
import { useMe } from '../auth/authHooks';
import { ONBOARDING_ROUTES } from '../onboarding/onboardingRoutes';
import { NEXT_LESSON_ROUTE } from '../path/lessonRoute';
import { REVIEW_ROUTES } from '../review/reviewRoutes';
import { clearReminderNotifications } from './pushDevice';
import { renewDeviceRegistration } from './reminderLifecycle';

/*
 * Screens of a running task or an unsaved form: a tapped reminder brings the app to the front but
 * leaves them. Screens with a parameter are matched by the path before it.
 */
const TASK_SCREENS = new Set<string>([
  REVIEW_ROUTES.lesson,
  NEXT_LESSON_ROUTE,
  ONBOARDING_ROUTES.placementTest,
  ONBOARDING_ROUTES.plan,
  ACCOUNT_ROUTES.displayName,
  ACCOUNT_ROUTES.email,
  ACCOUNT_ROUTES.password,
  ACCOUNT_ROUTES.delete,
  ACCOUNT_ROUTES.addEmail,
]);
const TASK_SCREEN_PREFIXES = [
  '/lesson/',
  '/statistik/ueben/',
  '/checkpoint/',
  ONBOARDING_ROUTES.placementResult(''),
];

export function isTaskScreen(pathname: string): boolean {
  return (
    TASK_SCREENS.has(pathname) || TASK_SCREEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

/**
 * The reminders during a signed-in session: the app being open makes the badge and the delivered
 * reminders stale, the device's registration is renewed once (or released, should it be another
 * learner's), and a tapped reminder shows its screen in the running app.
 */
export function useReminderSession(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    void clearReminderNotifications();
    const onShow = () => {
      if (document.visibilityState === 'visible') void clearReminderNotifications();
    };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, []);

  // Whose subscription this browser holds is told by the learner's address.
  const me = useMe().data;
  useOnceWhen(me !== undefined, () => void renewDeviceRegistration(queryClient, me?.email));

  useOpenScreenMessages();
}

/** The service worker asks the focused window to show a reminder's screen (src/sw/handlers.ts). */
function useOpenScreenMessages(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = useRef(pathname);

  useEffect(() => {
    current.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const worker = navigator.serviceWorker;
    const onMessage = (event: MessageEvent) => {
      if (!isOpenScreenMessage(event.data) || isTaskScreen(current.current)) return;
      if (event.data.path !== current.current) void navigate(event.data.path);
    };
    worker.addEventListener('message', onMessage);
    // Messages wait in a queue until the page asks for them.
    worker.startMessages();
    return () => worker.removeEventListener('message', onMessage);
  }, [navigate]);
}
