import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubApi } from '../../test/http';
import { renderRoutes } from '../../test/router';
import { splitPlaceholders } from './legalDocument';
import { ImprintPage, PrivacyPage } from './LegalPages';

function renderLegal(path: '/datenschutz' | '/impressum') {
  stubApi({});
  renderRoutes(
    [
      { path: '/datenschutz', element: <PrivacyPage /> },
      { path: '/impressum', element: <ImprintPage /> },
    ],
    path,
  );
}

const placeholders = () =>
  Array.from(document.querySelectorAll('mark'), (mark) => mark.textContent);

describe('splitPlaceholders', () => {
  it('separates the operator placeholders from the text around them', () => {
    expect(splitPlaceholders('Kontakt: «[Kontakt-E-Mail]», Schweiz.')).toEqual([
      { kind: 'text', text: 'Kontakt: ' },
      { kind: 'placeholder', text: '«[Kontakt-E-Mail]»' },
      { kind: 'text', text: ', Schweiz.' },
    ]);
  });

  it('keeps a text without placeholders whole', () => {
    expect(splitPlaceholders('Kein Tracking.')).toEqual([{ kind: 'text', text: 'Kein Tracking.' }]);
  });
});

describe('legal pages', () => {
  it('mark the privacy policy as a draft and highlight what the operator fills in', () => {
    renderLegal('/datenschutz');

    expect(screen.getByRole('note')).toHaveTextContent('Entwurf – vom Betreiber zu prüfen');
    expect(placeholders()).toEqual(
      expect.arrayContaining([
        '«[Name des Betreibers]»',
        '«[Adresse]»',
        '«[Kontakt-E-Mail]»',
        '«[Name und Sitz des Mail-Anbieters]»',
      ]),
    );
  });

  it('describe what Lingora stores and what it does not do', () => {
    renderLegal('/datenschutz');

    for (const heading of [
      'Welche Daten Lingora speichert',
      'Cookies und Speicher im Browser',
      'Kein Tracking, keine Drittanbieter',
      'E-Mails',
      'Wo die Daten liegen',
      'Deine Rechte',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
    const rights = screen.getByRole('region', { name: 'Deine Rechte' });
    expect(within(rights).getByText(/Backup herunterladen/)).toBeInTheDocument();
    expect(within(rights).getByText(/Konto löschen/)).toBeInTheDocument();
  });

  it('show the imprint with the operator placeholders and both legal links', () => {
    renderLegal('/impressum');

    expect(screen.getByRole('heading', { level: 1, name: 'Impressum' })).toBeInTheDocument();
    expect(placeholders()).toEqual(
      expect.arrayContaining(['«[Name des Betreibers]»', '«[PLZ Ort]»']),
    );
    const links = screen.getByRole('navigation', { name: 'Rechtliches' });
    expect(within(links).getByRole('link', { name: 'Datenschutz' })).toHaveAttribute(
      'href',
      '/datenschutz',
    );
  });
});
