import { ArrowLeftIcon, PencilSimpleLineIcon } from '@phosphor-icons/react';
import { useId } from 'react';
import { ScrollRestoration } from 'react-router';
import { useGoBack } from '../../app/useGoBack';
import { IconButton } from '../../components/ui/IconButton';
import { Wordmark } from '../../components/ui/Wordmark';
import { LEGAL_COPY } from './copy';
import type { LegalDocument, LegalSection } from './legalDocument';
import { LegalLinks } from './LegalLinks';
import { LegalText } from './LegalText';

/** A public legal page: readable without an account and marked as a draft until it is checked. */
export function LegalPage({ document }: { document: LegalDocument }) {
  const goBack = useGoBack('/');

  return (
    <div className="mx-auto flex min-h-dvh max-w-app flex-col px-gutter pb-[calc(var(--safe-bottom)+2rem)]">
      <header className="sticky top-0 z-(--z-bar) -mx-gutter flex h-[calc(4rem+var(--safe-top))] items-center gap-3 border-b-2 border-border bg-bg px-gutter pt-(--safe-top)">
        <IconButton icon={ArrowLeftIcon} label={LEGAL_COPY.back} variant="ghost" onClick={goBack} />
        <Wordmark size="sm" />
      </header>
      <main className="flex flex-1 flex-col gap-6 pt-6">
        <h1 className="text-headline font-black">{document.title}</h1>
        <DraftNote />
        <p className="text-body text-fg-muted">{document.intro}</p>
        {document.sections.map((section) => (
          <Section key={section.heading} section={section} />
        ))}
      </main>
      <LegalLinks className="mt-10" />
      <ScrollRestoration />
    </div>
  );
}

function DraftNote() {
  return (
    <div
      role="note"
      data-tone="warning"
      className="flex items-start gap-3 rounded-card-sm tone-outline px-4 py-3 text-label font-bold"
    >
      <PencilSimpleLineIcon aria-hidden="true" size={22} weight="bold" className="shrink-0" />
      <div className="min-w-0 text-fg">
        <p className="font-black">{LEGAL_COPY.draft.title}</p>
        <p className="text-fg-muted">
          <LegalText text={LEGAL_COPY.draft.text} />
        </p>
      </div>
    </div>
  );
}

function Section({ section }: { section: LegalSection }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-title font-black">
        {section.heading}
      </h2>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="text-body text-fg-muted">
          <LegalText text={paragraph} />
        </p>
      ))}
      {section.list && (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body text-fg-muted marker:text-primary-soft">
          {section.list.map((item) => (
            <li key={item}>
              <LegalText text={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
