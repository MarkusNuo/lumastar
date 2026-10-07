import type { LegalDocument } from './legalDocument';

/*
 * Draft of the privacy policy (German, Swiss orthography). It describes what this code base stores
 * and sends; everything that depends on the operator is a «[…]» placeholder.
 */
export const PRIVACY_POLICY: LegalDocument = {
  title: 'Datenschutzerklärung',
  intro:
    'Hier steht, welche Personendaten Lingora bearbeitet, wozu und wie lange. Massgebend ist das Schweizer Datenschutzgesetz (DSG).',
  sections: [
    {
      heading: 'Verantwortlich',
      paragraphs: [
        'Verantwortlich für die Bearbeitung ist «[Name des Betreibers]», «[Adresse]», «[PLZ Ort]», Schweiz. Kontakt: «[Kontakt-E-Mail]».',
      ],
    },
    {
      heading: 'Welche Daten Lingora speichert',
      list: [
        'Konto: deine E-Mail-Adresse, dein Anzeigename, das Datum der Registrierung und ob deine E-Mail-Adresse bestätigt ist.',
        'Passwort: nur als Hash (Argon2id). Dein Passwort selbst wird nie gespeichert.',
        'Lerndaten: deine Antworten auf Übungen, dein Lernstand pro Fertigkeit, deine Wiederholungskarten und ihr Verlauf, Einstufungstests, dein Lernplan, XP, Abzeichen, Streak und Lerntage.',
        'Einstellungen: Tagesziel, Ziel-Behaltensrate, die Zeitzone deines Geräts und deine Antworten aus dem Einstieg (Motivation, Selbsteinschätzung).',
        'Links in E-Mails: zufällige, zeitlich begrenzte Codes für die Bestätigung deiner E-Mail-Adresse und für ein neues Passwort.',
      ],
    },
    {
      heading: 'Wozu',
      paragraphs: [
        'Lingora bearbeitet diese Daten nur, um dir die App bereitzustellen: dich anzumelden, Lektionen auf deinen Lernstand abzustimmen, Wiederholungen zu planen und deinen Fortschritt zu zeigen. Die Daten werden nicht verkauft, nicht für Werbung genutzt und nur für den E-Mail-Versand weitergegeben (siehe unten).',
      ],
    },
    {
      heading: 'Cookies und Speicher im Browser',
      list: [
        'Ein Sitzungs-Cookie (LINGORA_SESSION) hält dich angemeldet. Es ist technisch nötig und endet, wenn du dich abmeldest oder die Sitzung abläuft.',
        'Ein Sicherheits-Cookie (XSRF-TOKEN) schützt vor gefälschten Anfragen anderer Websites.',
        'Ob Töne und Vibration an sind, speichert nur dein Browser auf deinem Gerät; der Server erfährt davon nichts.',
        'Die Programmdateien der App liegen im Browser-Cache, damit sie schnell startet. Lerndaten werden dort nicht gespeichert.',
      ],
    },
    {
      heading: 'Kein Tracking, keine Drittanbieter',
      paragraphs: [
        'Lingora verwendet keine Analyse- oder Tracking-Werkzeuge und keine Werbung. Die App lädt nichts von fremden Servern, auch keine Schriften oder Skripte, und spricht nur mit dem Server des Betreibers.',
        'Lingora sendet keine Daten an KI-Dienste. «KI-Zusammenfassung kopieren» legt den Text nur in deine Zwischenablage; was du damit machst, entscheidest du.',
      ],
    },
    {
      heading: 'E-Mails',
      paragraphs: [
        'Lingora schickt dir E-Mails nur, wenn es nötig ist: zur Bestätigung deiner E-Mail-Adresse, für ein neues Passwort und wenn du deine E-Mail-Adresse änderst. Sie werden über den Mail-Anbieter des Betreibers versendet: «[Name und Sitz des Mail-Anbieters]». Dieser erhält dafür deine E-Mail-Adresse und den Inhalt der Nachricht.',
      ],
    },
    {
      heading: 'Schutz vor Missbrauch',
      paragraphs: [
        'Damit niemand Passwörter erraten oder massenhaft Konten anlegen kann, zählt Lingora fehlgeschlagene Anmeldungen und häufige Anfragen (z. B. Registrierungen oder Links für ein neues Passwort) für kurze Zeit pro IP-Adresse.',
        '«[Falls der Webserver Zugriffe protokolliert: welche Daten, wozu und wie lange]»',
      ],
    },
    {
      heading: 'Wo die Daten liegen',
      paragraphs: [
        'Alle Daten liegen in einer Datenbank auf dem eigenen Server des Betreibers in der Schweiz («[Standort des Servers]»).',
      ],
    },
    {
      heading: 'Wie lange',
      paragraphs: [
        'Deine Daten bleiben gespeichert, solange dein Konto besteht. Löschst du dein Konto, werden das Konto und alle Lerndaten gelöscht. In Datensicherungen des Betreibers können sie noch bis zu «[Aufbewahrungsdauer der Backups]» enthalten sein.',
      ],
    },
    {
      heading: 'Deine Rechte',
      list: [
        'Auskunft: Unter Profil › Lerndaten › «Backup herunterladen» erhältst du jederzeit alle deine Lerndaten als ZIP-Datei.',
        'Berichtigung: Anzeigename, E-Mail-Adresse und Passwort änderst du unter Profil › Konto.',
        'Löschung: Unter Profil › Konto › «Konto löschen» löschst du dein Konto mit allen Lerndaten.',
        'Für alle anderen Anliegen schreib an «[Kontakt-E-Mail]».',
        'Du kannst dich ausserdem beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren.',
      ],
    },
    {
      heading: 'Änderungen',
      paragraphs: [
        'Ändert sich diese Erklärung, steht die neue Fassung auf dieser Seite. Stand: «[Datum]».',
      ],
    },
  ],
};
