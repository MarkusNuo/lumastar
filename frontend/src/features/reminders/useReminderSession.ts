import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useOnceWhen } from '../../lib/useOnceWhen';
import { isOpenScreenMessage } from '../../sw/messages';
import { NEXT_LESSON_ROUTE } from '../path/lessonRoute';
import { clearReminderNotifications } from './pushDevice';
import { renewDeviceRegistration } from './reminderLifecycle';

/** Screens of a running task; a tapped reminder brings the app to the front but leaves them. */
const TASK_SCREENS = [
  /^\/lesson\//,
  /^\/wiederholen\/lektion$/,
  /^\/statistik\/ueben\//,
  /^\/checkpoint\//,
  /^\/einstufung\/test$/,
  new RegExp(`^${NEXT_LESSON_ROUTE}$`),
];

export function isTaskScreen(pathname: string): boolean {
  return TASK_SCREENS.some((screen) => screen.test(pathname));
}

/**
 * The reminders during a signed-in session: the app being open makes the badge and the delivered
 * reminders stale, the device's registration is renewed once, and a tapped reminder shows its
 * screen in the running app.
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

  useOnceWhen(true, () => void renewDeviceRegistration(queryClient));

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
