import type { LegalDocument } from './legalDocument';

/* Draft of the imprint (German, Swiss orthography); the operator's data are «[…]» placeholders. */
export const IMPRINT: LegalDocument = {
  title: 'Impressum',
  intro: 'Angaben zum Betreiber dieser Lingora-Installation.',
  sections: [
    {
      heading: 'Betreiber',
      paragraphs: ['«[Name des Betreibers]»', '«[Adresse]»', '«[PLZ Ort]», Schweiz'],
    },
    {
      heading: 'Kontakt',
      paragraphs: ['E-Mail: «[Kontakt-E-Mail]»'],
    },
    {
      heading: 'Unternehmensangaben',
      paragraphs: ['«[Rechtsform und UID-Nummer, falls vorhanden]»'],
    },
    {
      heading: 'Lerninhalte',
      paragraphs: [
        'Lingora ist eine Lern-App für Gheg-Albanisch (Kosovo-Gheg). Die Lerninhalte werden laufend erweitert und geprüft; trotz aller Sorgfalt können sie Fehler enthalten.',
      ],
    },
  ],
};
