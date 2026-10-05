import { useId, type ReactNode } from 'react';

export interface StatsSectionProps {
  title: string;
  /** Short context at the end of the title line, e.g. the period shown. */
  subtitle?: string;
  children: ReactNode;
}

/** One titled block of the statistics tab. */
export function StatsSection({ title, subtitle, children }: StatsSectionProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2
          id={titleId}
          className="text-caption font-extrabold tracking-wider text-fg-muted uppercase"
        >
          {title}
        </h2>
        {subtitle && <p className="text-caption font-bold text-fg-subtle">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
