import { describe, expect, it } from 'vitest';
import { NEXT_LESSON_ROUTE } from '../features/path/lessonRoute';
import { WORKER_COPY } from './copy';
import {
  appPath,
  parseReminder,
  readPushData,
  readReminderData,
  REMINDER_BADGE,
  REMINDER_ICON,
  targetPath,
} from './reminder';

const ORIGIN = 'https://lingora.test';

describe('readPushData', () => {
  it('reads the JSON of the message', () => {
    expect(readPushData({ json: () => ({ title: 'Hallo' }) })).toEqual({ title: 'Hallo' });
  });

  it('gives undefined for a message without data or with text that is not JSON', () => {
    expect(readPushData(null)).toBeUndefined();
    expect(
      readPushData({
        json: () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
    ).toBeUndefined();
  });
});

describe('parseReminder', () => {
  it('fills in everything a malformed message lacks', () => {
    expect(parseReminder({ title: '  ', actions: 'none', badgeCount: -1 }, ORIGIN)).toEqual({
      title: WORKER_COPY.fallback.title,
      body: WORKER_COPY.fallback.body,
      url: '/',
      tag: 'lingora-reminder',
      renotify: true,
      icon: REMINDER_ICON,
      badge: REMINDER_BADGE,
      actions: [],
      badgeCount: undefined,
      snoozeToken: undefined,
    });
  });

  it('keeps only the actions the worker handles, with a title', () => {
    const reminder = parseReminder(
      {
        actions: [
          { action: 'practise', title: 'Jetzt üben' },
          { action: 'snooze' },
          { action: 'share', title: 'Teilen' },
          'snooze',
          null,
        ],
      },
      ORIGIN,
    );

    expect(reminder.actions).toEqual([{ action: 'practise', title: 'Jetzt üben' }]);
  });

  it('respects an explicit renotify of false', () => {
    expect(parseReminder({ renotify: false }, ORIGIN).renotify).toBe(false);
  });
});

describe('appPath', () => {
  it('keeps paths, queries and fragments of the app', () => {
    expect(appPath('/wiederholen?quelle=push#start', ORIGIN)).toBe(
      '/wiederholen?quelle=push#start',
    );
    expect(appPath(`${ORIGIN}/statistik`, ORIGIN)).toBe('/statistik');
  });

  it('replaces another origin with the fallback', () => {
    expect(appPath('https://evil.example/', ORIGIN)).toBe('/');
    expect(appPath('//evil.example/x', ORIGIN, '/icons/icon-192.png')).toBe('/icons/icon-192.png');
  });
});

describe('targetPath', () => {
  const data = readReminderData({ url: '/wiederholen', tag: 't' }, ORIGIN);

  it('leads "Jetzt üben" to the next lesson and a tap to the reminder path', () => {
    expect(targetPath('practise', data)).toBe(NEXT_LESSON_ROUTE);
    expect(targetPath('', data)).toBe('/wiederholen');
  });
});
