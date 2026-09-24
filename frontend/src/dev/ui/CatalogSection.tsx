import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

interface CatalogSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function CatalogSection({ id, title, children }: CatalogSectionProps) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="flex scroll-mt-32 flex-col gap-6 border-t-2 border-border pt-8"
    >
      <h2 id={titleId} className="text-headline font-black">
        {title}
      </h2>
      {children}
    </section>
  );
}

interface SpecimenProps {
  label: string;
  children: ReactNode;
  /** Layout of the specimens; defaults to a wrapping row. */
  layout?: 'row' | 'stack' | 'grid';
}

const layoutClass = {
  row: 'flex flex-wrap items-center gap-3',
  stack: 'flex flex-col gap-3',
  grid: 'grid grid-cols-2 gap-3',
} as const;

/** One labelled group of component variants. */
export function Specimen({ label, children, layout = 'row' }: SpecimenProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-micro font-extrabold tracking-wider text-fg-subtle uppercase">{label}</h3>
      <div className={cx(layoutClass[layout])}>{children}</div>
    </div>
  );
}
