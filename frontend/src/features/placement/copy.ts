/** UI copy of the placement test and the level reveal (German, Swiss orthography). */
export const PLACEMENT_COPY = {
  intro: {
    eyebrow: 'Einstufung',
    title: 'Finden wir dein Niveau',
    text: 'Ein kurzer Test mit Fragen, die sich deinen Antworten anpassen. Falsche Antworten sind okay – so finden wir heraus, wo du stehst.',
    facts: {
      duration: 'ca. 5–8 Minuten',
      relaxed: 'kein Stress, keine Noten',
    },
    replacementTitle: 'Neu einstufen',
    replacementText:
      'Der Test prüft dein aktuelles Niveau. Danach passt Lingora deinen Lernplan an.',
    start: 'Test starten',
    skip: 'Ich fange bei null an',
    back: 'Zurück',
    skipFailed: 'Das hat nicht geklappt. Prüfe deine Verbindung und versuch es nochmals.',
  },
  test: {
    loading: 'Einstufungstest wird vorbereitet',
    progressLabel: 'Fortschritt der Einstufung',
    progressValue: (position: number, max: number) => `Frage ${position} von höchstens ${max}`,
    counter: (position: number, max: number) => `${position}/${max}`,
    close: 'Einstufung abbrechen',
    next: 'Weiter',
    answerFailed:
      'Deine Antwort ist nicht angekommen. Prüfe deine Verbindung und tippe nochmals auf „Weiter“.',
    quit: {
      title: 'Einstufung abbrechen?',
      text: 'Deine Antworten gehen verloren. Du kannst den Test jederzeit neu starten.',
      stay: 'Weitermachen',
      leave: 'Abbrechen',
    },
    failure: {
      title: 'Der Test konnte nicht starten',
      network: 'Lingora erreicht den Server gerade nicht. Prüfe deine Verbindung.',
      unavailable: 'Für den Einstufungstest gibt es noch keine Aufgaben.',
      retry: 'Nochmals versuchen',
      back: 'Zurück',
    },
    broken: {
      title: 'Der Test wurde unterbrochen',
      text: 'Dieser Einstufungstest läuft nicht mehr, vielleicht wurde er anderswo neu gestartet. Starte einfach einen neuen.',
      restart: 'Neu starten',
    },
  },
  reveal: {
    loading: 'Ergebnis wird geladen',
    loadFailed: 'Dein Ergebnis konnte nicht geladen werden',
    network: 'Lingora erreicht den Server gerade nicht. Prüfe deine Verbindung.',
    unknownTest: 'Zu diesem Test gibt es kein Ergebnis.',
    retry: 'Nochmals versuchen',
    back: 'Zum Lernpfad',
    eyebrow: 'Dein Ergebnis',
    level: (level: string) => `Du bist auf Niveau ${level}`,
    skippedLevel: (level: string) => `Du startest bei ${level}`,
    skippedText: 'Wir fangen ganz vorne an: mit den Lauten und den ersten Wörtern.',
    answered: (count: number) =>
      `${count} ${count === 1 ? 'Frage' : 'Fragen'} beantwortet – stark gemacht!`,
    strengths: 'Das kannst du schon gut',
    weaknesses: 'Daran arbeiten wir',
    toPlan: 'Meinen Lernplan ansehen',
  },
} as const;
