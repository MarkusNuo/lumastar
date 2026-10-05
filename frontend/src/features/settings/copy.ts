import type { ImportResult } from '../../api/types';
import { formatPercent } from '../../lib/formatPercent';
import { MAX_BACKUP_MB } from './backupFile';

const count = (value: number, singular: string, plural: string) =>
  `${value.toLocaleString('de-CH')} ${value === 1 ? singular : plural}`;

const swissDate = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' });

/** Sentence appended to import errors after which the server provably changed nothing. */
const UNCHANGED = 'Deine Lerndaten sind unverändert.';

const RETENTION = {
  description: 'Erweitert: wie oft Wörter wiederkommen',
  toggle: 'Ziel-Behaltensrate anpassen',
};

/** UI copy of the profile tab (German, Swiss orthography). */
export const PROFILE_COPY = {
  title: 'Profil',
  loading: 'Profil wird geladen',
  xp: (xp: number) => `${xp.toLocaleString('de-CH')} XP`,
  level: (level: string) => `Niveau ${level}`,
  noLevel: 'Noch nicht eingestuft',
  loadFailed: 'Dein Profil konnte nicht geladen werden.',
  settings: {
    title: 'Einstellungen',
    loadFailed: 'Tagesziel und Behaltensrate konnten nicht geladen werden.',
    sound: { label: 'Töne', description: 'Klänge für richtig, falsch und Lektionsende' },
    haptics: { label: 'Vibration', description: 'Kurzes Vibrieren bei jeder Antwort' },
    dailyGoal: {
      label: 'Tagesziel',
      loading: 'Tagesziel wird geladen',
      option: (minutes: number) => `${minutes} Min.`,
      saveFailed: 'Dein Tagesziel konnte nicht gespeichert werden. Versuch es nochmals.',
      planUpdated: 'Lernplan angepasst',
      estimate: (band: string, day: string) => `${band} bis ca. ${day}`,
      previously: (day: string) => `vorher ${day}`,
    },
    retention: {
      label: 'Ziel-Behaltensrate',
      description: RETENTION.description,
      valueDescription: (percent: number) => `${formatPercent(percent)} · ${RETENTION.description}`,
      toggle: RETENTION.toggle,
      toggleValue: (percent: number) => `${RETENTION.toggle}: ${formatPercent(percent)}`,
      percent: formatPercent,
      explanation:
        'So sicher sollst du ein Wort noch wissen, wenn es zur Wiederholung kommt. Höher heisst: öfter wiederholen und besser behalten. Tiefer heisst: weniger Wiederholungen, aber mehr vergessen.',
      less: 'Weniger Wiederholungen',
      more: 'Besser behalten',
      reset: (percent: number) => `Standard (${formatPercent(percent)})`,
      save: 'Speichern',
      saved: (percent: number) => `Ziel-Behaltensrate gespeichert: ${formatPercent(percent)}`,
      saveFailed: 'Die Behaltensrate konnte nicht gespeichert werden. Versuch es nochmals.',
    },
  },
  learning: {
    title: 'Lernen',
    plan: { label: 'Lernplan ansehen', description: 'Deine Zeitleiste bis C2' },
    placement: { label: 'Neu einstufen', description: 'Einstufungstest wiederholen' },
  },
  logout: 'Abmelden',
  logoutFailed: 'Abmelden hat nicht geklappt. Prüfe deine Verbindung und versuch es nochmals.',
  learningData: {
    title: 'Lerndaten',
    copySummary: {
      label: 'KI-Zusammenfassung kopieren',
      description: 'Dein Lernstand für einen KI-Chat',
    },
    viewSummary: {
      label: 'Zusammenfassung ansehen',
      description: 'Niveau, Stärken, Schwächen, Fehler',
    },
    download: {
      label: 'Backup herunterladen',
      description: 'Alle Lerndaten als ZIP-Datei',
    },
    import: {
      label: 'Backup importieren',
      description: 'Ersetzt deine aktuellen Lerndaten',
      fileLabel: 'Backup-Datei wählen',
    },
  },
  summary: {
    title: 'KI-Zusammenfassung',
    loading: 'Zusammenfassung wird geladen',
    loadFailed: 'Die Zusammenfassung konnte nicht geladen werden. Versuch es nochmals.',
    copy: 'Kopieren',
    copied: 'Kopiert! Füge sie in einen KI-Chat ein.',
    manualCopy:
      'Automatisches Kopieren geht hier nicht. Markiere den Text und kopiere ihn von Hand.',
    textLabel: 'Zusammenfassung als Text',
    done: 'Fertig',
  },
  backup: {
    downloadFailed: 'Das Backup konnte nicht heruntergeladen werden. Versuch es nochmals.',
    downloaded: (filename: string) => `Backup gespeichert: ${filename}`,
    confirm: {
      title: 'Backup importieren?',
      text: (fileName: string) =>
        `Alle aktuellen Lerndaten werden durch das Backup „${fileName}“ ersetzt. Fortfahren?`,
      cancel: 'Abbrechen',
      replace: 'Ersetzen',
    },
    imported: ({ exportedAt, imported }: ImportResult) =>
      `Backup vom ${swissDate.format(new Date(exportedAt))} importiert: ${count(imported.sessions, 'Lektion', 'Lektionen')}, ${count(imported.attempts, 'Antwort', 'Antworten')}.`,
    details: 'Details',
    problems: {
      tooLarge: `Die Datei ist zu gross. Ein Backup darf höchstens ${MAX_BACKUP_MB} MB haben, auch entpackt. ${UNCHANGED}`,
      invalidArchive: `Diese Datei ist kein Lingora-Backup. Wähle eine ZIP-Datei, die du hier heruntergeladen hast. ${UNCHANGED}`,
      unsupportedVersion: `Dieses Backup stammt aus einer Lingora-Version, die diese Installation nicht kennt. ${UNCHANGED}`,
      invalidData: `Das Backup enthält ungültige Daten. ${UNCHANGED}`,
      unknownContent: (parts: string[]) =>
        `Das Backup verweist auf Inhalte, die es hier nicht gibt${parts.length > 0 ? ` (${parts.join(', ')})` : ''}. ${UNCHANGED}`,
      unknownContentParts: {
        units: (n: number) => count(n, 'Einheit', 'Einheiten'),
        exercises: (n: number) => count(n, 'Übung', 'Übungen'),
        items: (n: number) => count(n, 'Wort', 'Wörter'),
        skillTags: (n: number) => count(n, 'Fertigkeit', 'Fertigkeiten'),
      },
      network: 'Lingora erreicht den Server gerade nicht. Prüfe deine Verbindung.',
      failed: 'Der Import hat nicht geklappt. Versuch es nochmals.',
    },
  },
} as const;
