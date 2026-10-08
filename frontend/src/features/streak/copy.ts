import { parseDay } from '../plan/estimates';
import type { CalendarDayState } from './calendar/calendarMonth';

const dayMonth = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long' });
const weekdayDayMonth = new Intl.DateTimeFormat('de-CH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const monthYear = new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' });

/** "1 Tag", "10 Tage" */
const days = (count: number) => `${count} ${count === 1 ? 'Tag' : 'Tage'}`;
/** "2026-10-03" → "3. Oktober" */
const dayName = (isoDay: string) => dayMonth.format(parseDay(isoDay));
/** "2026-10-13" → "Montag, 13. Oktober" */
const weekdayName = (isoDay: string) => weekdayDayMonth.format(parseDay(isoDay));

const CHEERS = ['Feuer und Flamme!', 'Stark, weiter so!', 'Du bist kaum zu bremsen!'] as const;

const DAY_STATE: Record<CalendarDayState, string> = {
  met: 'Streak-Tag',
  frozen: 'Streak-Schutz eingesetzt',
  open: 'kein Streak-Tag',
  future: '',
};

/** UI copy of the streak screen and the streak celebration (German, Swiss orthography). */
export const STREAK_COPY = {
  screen: {
    title: 'Streak',
    back: 'Zurück',
    loading: 'Streak wird geladen',
    loadFailed: 'Dein Streak konnte nicht geladen werden. Prüfe deine Verbindung.',
  },
  hero: {
    unit: (count: number) => (count === 1 ? 'Tag Streak' : 'Tage Streak'),
    label: (count: number) => `${days(count)} Streak`,
    doneToday: 'Heute geschafft!',
    minutesLeft: (left: number) => `Heute noch ${left} Min. bis zum Tagesziel`,
    longest: (count: number) => `Rekord: ${days(count)}`,
  },
  calendar: {
    /** "2026-10" → "Oktober 2026" */
    title: (month: string) => monthYear.format(parseDay(`${month}-01`)),
    previous: 'Vorheriger Monat',
    next: 'Nächster Monat',
    weekdays: [
      { short: 'Mo', long: 'Montag' },
      { short: 'Di', long: 'Dienstag' },
      { short: 'Mi', long: 'Mittwoch' },
      { short: 'Do', long: 'Donnerstag' },
      { short: 'Fr', long: 'Freitag' },
      { short: 'Sa', long: 'Samstag' },
      { short: 'So', long: 'Sonntag' },
    ],
    /** "3. Oktober: Streak-Tag", "8. Oktober, heute: Tagesziel noch offen" */
    day: (isoDay: string, state: CalendarDayState, today: boolean) => {
      if (today) {
        return `${dayName(isoDay)}, heute: ${state === 'open' ? 'Tagesziel noch offen' : DAY_STATE[state]}`;
      }
      return state === 'future' ? dayName(isoDay) : `${dayName(isoDay)}: ${DAY_STATE[state]}`;
    },
    summary: (streakDays: number, frozenDays: number) =>
      `${streakDays === 1 ? '1 Streak-Tag' : `${streakDays} Streak-Tage`} in diesem Monat${
        frozenDays > 0 ? `, ${frozenDays} davon mit Streak-Schutz` : ''
      }`,
    empty: 'In diesem Monat gibt es noch keine Streak-Tage.',
    legend: { met: 'Streak-Tag', frozen: 'Streak-Schutz', today: 'Heute' },
  },
  goal: {
    title: 'Streak-Ziel',
    target: (count: number) => `Ziel: ${days(count)}`,
    reached: (count: number) => `Ziel erreicht: ${days(count)}!`,
    progressLabel: 'Fortschritt zum Streak-Ziel',
    progressValue: (progress: number, target: number) => `${progress} von ${target} Tagen`,
    remaining: (left: number) => `Noch ${days(left)}`,
    chooseNext: 'Wähle dein nächstes Ziel.',
    nextLabel: 'Nächstes Ziel',
    change: 'Ziel ändern',
    changeLabel: 'Neues Ziel',
    cancel: 'Abbrechen',
    option: days,
    saved: (count: number) => `Neues Ziel: ${days(count)}`,
    saveFailed: 'Das Ziel konnte nicht gespeichert werden. Versuch es nochmals.',
  },
  freeze: {
    title: 'Streak-Schutz',
    status: (available: number, perWeek: number) =>
      available > 0 ? `${available} von ${perWeek} bereit` : 'Diese Woche eingesetzt',
    explanation:
      'Verpasst du einen Tag, rettet ein Streak-Schutz deinen Streak automatisch. Pro Woche gibt es einen.',
    resetsOn: (isoDay: string) => `Wird am ${weekdayName(isoDay)} zurückgesetzt.`,
    lastUsed: (isoDay: string) => `Zuletzt eingesetzt am ${weekdayName(isoDay)}.`,
    neverUsed: 'Bisher noch nie gebraucht.',
  },
  celebration: {
    kicker: (current: number) => (current === 1 ? 'Dein Streak beginnt!' : 'Streak verlängert!'),
    unit: (count: number) => (count === 1 ? 'Tag Streak' : 'Tage Streak'),
    title: (count: number) => `${days(count)} Streak!`,
    text: (count: number) =>
      count === 1
        ? 'Dein Tagesziel ist erreicht und deine Flamme brennt. Komm morgen wieder!'
        : 'Tagesziel erreicht! Komm morgen wieder, damit deine Flamme weiterbrennt.',
    freezeUsed:
      'Dein Streak-Schutz hat den verpassten Tag überbrückt. Pro Woche gibt es einen davon.',
    /** The mascot's cheer; the first day gets its own. */
    cheer: (count: number) =>
      count === 1 ? 'Der erste Funke ist gezündet!' : (CHEERS[count % CHEERS.length] ?? CHEERS[0]),
    continue: 'Weiter',
    goal: {
      kicker: 'Streak-Ziel',
      title: (count: number) => `Ziel erreicht: ${days(count)}!`,
      text: (count: number) => `${days(count)} am Stück gelernt. Wie weit gehst du als Nächstes?`,
      later: 'Du kannst dein nächstes Ziel auch später auf der Streak-Seite wählen.',
    },
  },
} as const;
