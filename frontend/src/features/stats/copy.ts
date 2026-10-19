import type { CheckpointStatus } from '../../api/types';
import { formatPercent } from '../../lib/formatPercent';

const count = (value: number) => value.toLocaleString('de-CH');

/** UI copy of the statistics tab (German, Swiss orthography). */
export const STATS_COPY = {
  title: 'Statistik',
  loading: 'Statistik wird geladen',
  loadFailed: 'Deine Statistik konnte nicht geladen werden. Prüfe deine Verbindung.',
  summary: {
    streak: 'Streak',
    longest: 'Rekord',
    words: 'Wörter',
    streakValue: (value: number) => `Streak: ${value} ${value === 1 ? 'Tag' : 'Tage'}`,
    longestValue: (value: number) => `Längster Streak: ${value} ${value === 1 ? 'Tag' : 'Tage'}`,
    wordsValue: (value: number) => `${count(value)} ${value === 1 ? 'Wort' : 'Wörter'} gelernt`,
  },
  level: {
    title: 'Niveau',
    stage: (level: string, title: string) => `${level} · ${title}`,
    progressLabel: 'Fortschritt zur nächsten Stufe',
    progressValue: formatPercent,
    units: (done: number, total: number) =>
      `${done} von ${total} ${total === 1 ? 'Einheit' : 'Einheiten'} geschafft`,
    next: (level: string) => `Danach: ${level}`,
    lastStage: 'Letzte Stufe vor dem Ziel C2',
    checkpoint: {
      locked: 'Checkpoint noch gesperrt',
      available: 'Checkpoint bereit',
      passed: 'Checkpoint bestanden',
    } satisfies Record<CheckpointStatus, string>,
    none: 'Noch nicht eingestuft',
    noneText: 'Nach dem Einstufungstest siehst du hier dein Niveau und den Weg zur nächsten Stufe.',
  },
  mastery: {
    title: 'Können pro Bereich',
    hint: 'Aus deinen Antworten und dem Einstufungstest.',
    percent: formatPercent,
    noData: 'noch offen',
    noDataValue: 'noch keine Daten',
  },
  errors: {
    title: 'Häufigste Fehler',
    subtitle: 'Letzte 30 Tage',
    rate: formatPercent,
    rateLabel: (label: string) => `Fehlerquote ${label}`,
    detail: (errors: number, attempts: number) =>
      `${count(errors)} von ${count(attempts)} ${attempts === 1 ? 'Antwort' : 'Antworten'} falsch`,
    practice: 'Gezielt üben',
    practiceLabel: (label: string) => `Gezielt üben: ${label}`,
    noPractice: 'Auf deinem Niveau gibt es dafür noch keine Übungen.',
    emptyTitle: 'Keine häufigen Fehler',
    emptyText: 'In den letzten 30 Tagen ist dir nichts mehrfach misslungen. Stark!',
  },
  heatmap: {
    title: 'Lerntage',
    subtitle: 'Letzte 365 Tage',
    summary: (practised: number, goals: number, frozen: number) =>
      [
        `An ${count(practised)} ${practised === 1 ? 'Tag' : 'Tagen'} geübt`,
        `${count(goals)}-mal Tagesziel erreicht`,
        ...(frozen > 0
          ? [`${count(frozen)} ${frozen === 1 ? 'Tag' : 'Tage'} mit Streak-Schutz überbrückt`]
          : []),
      ].join(' · '),
    legend: {
      none: 'Nicht geübt',
      practised: 'Geübt',
      goal: 'Tagesziel erreicht',
      frozen: 'Streak-Schutz',
    },
    cell: (day: string, minutes: number, state: string) => `${day}: ${minutes} Min., ${state}`,
    months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    weekdays: ['Mo', '', 'Mi', '', 'Fr', '', ''],
  },
  forecast: {
    title: 'Wiederholungen',
    tomorrow: 'Morgen fällig',
    tomorrowValue: (value: number) => `Morgen fällig: ${count(value)}`,
    dueNow: (value: number) =>
      value > 0 ? `Jetzt fällig: ${count(value)}` : 'Gerade ist nichts fällig.',
    review: 'Jetzt wiederholen',
    chart: 'Fällige Karten in den nächsten 7 Tagen',
    today: 'Heute',
    bar: (day: string, value: number) => `${day}: ${count(value)} fällig`,
  },
  practice: {
    failureTitle: 'Gezielt üben konnte nicht starten',
    noExercises: 'Für diese Fertigkeit gibt es auf deinem Niveau noch keine Übungen.',
    unknownSkill: 'Diese Fertigkeit kennt Lumastar nicht.',
    back: 'Zur Statistik',
  },
} as const;
