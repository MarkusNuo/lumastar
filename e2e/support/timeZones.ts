import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { csrfHeaders } from './csrf.ts';
import { fetchSettings } from './progressApi.ts';

/*
 * Reminders follow the wall clock of the learner's time zone. The backend has no test clock, so
 * a test that needs "now" at a certain time of day moves its learner into a time zone where it is.
 */

/** Zones without daylight saving time, about one per hour from UTC−10 to UTC+14. */
const ZONES_WITHOUT_DST = [
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Bogota',
  'America/Sao_Paulo',
  'Atlantic/Cape_Verde',
  'UTC',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Brisbane',
  'Pacific/Noumea',
  'Pacific/Fiji',
  'Pacific/Tongatapu',
  'Pacific/Kiritimati',
] as const;

/** The wall clock of a time zone at an instant. */
export interface LocalTime {
  zone: string;
  hour: number;
  minute: number;
  second: number;
}

export function localTime(zone: string, at = new Date()): LocalTime {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value);
  return { zone, hour: part('hour'), minute: part('minute'), second: part('second') };
}

/** "HH:mm", the format of the reminder times. */
export const hhmm = ({ hour, minute }: Pick<LocalTime, 'hour' | 'minute'>): string =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/** Seconds until the local day ends (no DST change in these zones). */
export const secondsLeftInDay = ({ hour, minute, second }: LocalTime): number =>
  24 * 3600 - (hour * 3600 + minute * 60 + second);

/** A zone where it is around midday now: far from midnight, so a snooze still ends today. */
export function zoneAroundMidday(at = new Date()): LocalTime {
  const [closest] = ZONES_WITHOUT_DST.map((zone) => localTime(zone, at)).sort(
    (a, b) => Math.abs(a.hour * 60 + a.minute - 12 * 60) - Math.abs(b.hour * 60 + b.minute - 12 * 60),
  );
  if (!closest) throw new Error('No time zone to choose from');
  return closest;
}

/** Moves the signed-in learner into the time zone (PUT /api/settings keeps the other settings). */
export async function moveLearnerTo(request: APIRequestContext, zone: string): Promise<void> {
  const settings = await fetchSettings(request);
  const response = await request.put('/api/settings', {
    headers: await csrfHeaders(request),
    data: { ...settings, timeZone: zone },
  });
  expect(response.status(), await response.text()).toBe(200);
}

/**
 * Moves the learner of a running app into the time zone. The app stores the device's time zone once
 * at the start of a session, so the move waits for that store: made earlier, it would be undone.
 */
export async function moveLearnerAfterAppStart(page: Page, zone: string): Promise<void> {
  const deviceZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  await expect
    .poll(async () => (await fetchSettings(page.request)).timeZone, { message: "the app stores the device's time zone" })
    .toBe(deviceZone);
  await moveLearnerTo(page.request, zone);
}
