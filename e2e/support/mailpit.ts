import { expect } from '@playwright/test';
import { FRONTEND_URL, MAILPIT } from './env.ts';

/*
 * The account mails as Mailpit caught them (REST API v1). The backend sends them after the commit on
 * a background thread, so a test waits for each one. Every account of a run has an address of its
 * own, so an inbox is simply all mails to that address.
 */

/** The subjects of the backend's account mails (German, Swiss orthography). */
export const SUBJECTS = {
  verify: 'Bitte bestätige deine E-Mail-Adresse',
  confirmChange: 'Bestätige deine neue E-Mail-Adresse',
  reset: 'Neues Passwort für Lingora',
  deleted: 'Dein Lingora-Konto wurde gelöscht',
} as const;
export type Subject = (typeof SUBJECTS)[keyof typeof SUBJECTS];

/** The page of the web app a mail's link opens. */
export type LinkPage = '/verify-email' | '/reset-password';

interface Address {
  Address: string;
}

interface MessageSummary {
  ID: string;
  To: Address[];
  Subject: string;
  Created: string;
}

export interface Mail {
  id: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}

const POLL_INTERVALS_MS = [100, 250, 500, 1000];
const MAIL_TIMEOUT_MS = 20_000;

async function mailpit<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MAILPIT.api}${path}`, init);
  if (!response.ok) throw new Error(`Mailpit ${init?.method ?? 'GET'} ${path}: ${response.status}`);
  return (await response.json()) as T;
}

const searchPath = (query: string) => `/search?query=${encodeURIComponent(query)}&limit=200`;

/** Whether Mailpit answers on its API port. */
export async function mailpitIsUp(): Promise<boolean> {
  try {
    await mailpit('/info');
    return true;
  } catch {
    return false;
  }
}

/** Deletes every mail whose recipient contains the text, e.g. the run id of a run's addresses. */
export async function deleteMailsTo(recipientPart: string): Promise<void> {
  const response = await fetch(`${MAILPIT.api}${searchPath(`to:"${recipientPart}"`)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Mailpit delete for ${recipientPart}: ${response.status}`);
}

/** All mails to exactly this address, oldest first. */
async function summariesTo(address: string): Promise<MessageSummary[]> {
  const { messages } = await mailpit<{ messages: MessageSummary[] }>(searchPath(`to:"${address}"`));
  const wanted = address.toLowerCase();
  return messages
    .filter((message) => message.To.some((to) => to.Address.toLowerCase() === wanted))
    .sort((a, b) => a.Created.localeCompare(b.Created));
}

async function read(summary: MessageSummary): Promise<Mail> {
  const message = await mailpit<{ ID: string; To: Address[]; Subject: string; Text: string; HTML: string }>(
    `/message/${summary.ID}`,
  );
  return {
    id: message.ID,
    to: message.To.map((to) => to.Address),
    subject: message.Subject,
    // MIME text parts travel with CRLF line breaks.
    text: message.Text.replaceAll('\r\n', '\n'),
    html: message.HTML,
  };
}

/**
 * The mails to one address. `next` hands out each mail once, oldest first, so a test can tell the
 * second verification mail from the first one.
 */
export class Inbox {
  readonly address: string;
  private readonly taken = new Set<string>();

  constructor(address: string) {
    this.address = address;
  }

  /** Waits for the next mail with this subject that `next` has not returned yet. */
  async next(subject: Subject): Promise<Mail> {
    let found: MessageSummary | undefined;
    await expect
      .poll(
        async () => {
          found = (await summariesTo(this.address)).find(
            (message) => message.Subject === subject && !this.taken.has(message.ID),
          );
          return found !== undefined;
        },
        { message: `a mail "${subject}" to ${this.address}`, timeout: MAIL_TIMEOUT_MS, intervals: POLL_INTERVALS_MS },
      )
      .toBe(true);
    if (!found) throw new Error('unreachable: the poll found a mail');
    this.taken.add(found.ID);
    return read(found);
  }

  /** The subjects of every mail to the address so far, oldest first. */
  async subjects(): Promise<string[]> {
    return (await summariesTo(this.address)).map((message) => message.Subject);
  }
}

/**
 * The link of an account mail, checked as a learner would see it: the text and the HTML part carry
 * the same link to a page of the e2e frontend (LINGORA_PUBLIC_URL) with a URL-safe token.
 */
export function linkIn(mail: Mail, page: LinkPage): string {
  const links = mail.text.match(/https?:\/\/\S+/g) ?? [];
  expect(links, `one link in "${mail.subject}"`).toHaveLength(1);
  const link = links[0] ?? '';
  expect(link).toMatch(new RegExp(`^${FRONTEND_URL.replaceAll('.', '\\.')}${page}\\?token=[A-Za-z0-9_-]{32,}$`));
  expect(mail.html, 'the button and the fallback link of the HTML part').toContain(`href="${link}"`);
  return link;
}

/** The parts every account mail shares: German greeting with the name, signature, no ß. */
export function expectAccountMail(mail: Mail, displayName: string): void {
  expect(mail.text.startsWith(`Hallo ${displayName}\n`), mail.text).toBe(true);
  expect(mail.text.trimEnd().endsWith('Lingora'), mail.text).toBe(true);
  expect(mail.html).toContain('<html lang="de">');
  expect(`${mail.subject}\n${mail.text}`, 'Swiss orthography').not.toContain('ß');
}
