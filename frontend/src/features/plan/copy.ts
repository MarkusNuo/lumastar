import type { PlanChangeKind, PlanUnitStatus } from '../../api/types';
import type { CefrLevel } from '../../components/ui/levels';

const count = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

/** "in ca. 5 Wochen": days ahead in the coarsest unit that still says something. */
function relativeDays(days: number): string {
  if (days < 1) return 'schon fast geschafft';
  if (days < 14) return `in ca. ${count(days, 'Tag', 'Tagen')}`;
  if (days < 70) return `in ca. ${Math.round(days / 7)} Wochen`;
  if (days < 730) return `in ca. ${Math.round(days / 30.44)} Monaten`;
  return `in ca. ${Math.round(days / 365.25)} Jahren`;
}

/** UI copy of the learning plan (German, Swiss orthography). */
export const PLAN_COPY = {
  title: 'Dein Lernplan',
  back: 'Zurück',
  loading: 'Lernplan wird geladen',
  loadFailed: 'Dein Lernplan konnte nicht geladen werden. Prüfe deine Verbindung.',
  route: (from: string, to: string) => `Von ${from} bis ${to}`,
  dailyGoal: (minutes: number) => `bei ${minutes} Min. pro Tag`,
  timeline: 'Zeitleiste bis C2',
  /** Short names of the CEFR bands. */
  bands: {
    A0: 'Erste Schritte',
    A1: 'Einstieg',
    A2: 'Grundlagen',
    B1: 'Mittelstufe',
    B2: 'Gute Mittelstufe',
    C1: 'Fortgeschritten',
    C2: 'Fast wie Muttersprache',
  } satisfies Record<CefrLevel, string>,
  band: (band: string, name: string) => `${band} · ${name}`,
  estimate: (day: string, days: number) => `ca. ${day} · ${relativeDays(days)}`,
  lessonsLabel: (band: string) => `Lektionen in ${band}`,
  lessons: (done: number, total: number) => `${done} von ${count(total, 'Lektion', 'Lektionen')}`,
  here: 'Du bist hier',
  showUnits: (units: number) => `${count(units, 'Einheit', 'Einheiten')} anzeigen`,
  hideUnits: 'Einheiten ausblenden',
  stage: (level: string, title: string) => `${level} · ${title}`,
  unitStatus: {
    completed: 'Abgeschlossen',
    in_progress: 'Als Nächstes',
    skipped: 'Übersprungen',
    planned: 'Geplant',
  } satisfies Record<PlanUnitStatus, string>,
  focus: 'Fokus-Lektion',
  comingSoon: 'Bald verfügbar',
  unitLessons: (lessons: number) => count(lessons, 'Lektion', 'Lektionen'),
  goal: (target: string) => `Ziel: ${target}`,
  history: {
    title: 'Plan-Verlauf',
    loading: 'Plan-Verlauf wird geladen',
    loadFailed: 'Der Plan-Verlauf konnte nicht geladen werden.',
    empty: 'Noch keine Änderungen.',
    kinds: {
      plan_created: 'Plan erstellt',
      focus_inserted: 'Fokus-Lektion eingefügt',
      unit_skipped: 'Einheit übersprungen',
      unit_shortened: 'Einheit verkürzt',
      level_changed: 'Niveau geändert',
      replanned: 'Plan neu berechnet',
    } satisfies Record<PlanChangeKind, string>,
  },
  toPath: 'Zum Lernpfad',
} as const;
