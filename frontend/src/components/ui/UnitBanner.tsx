import { BookOpenTextIcon } from '@phosphor-icons/react';
import { cx } from '../../lib/cx';
import { unitTone, type UnitColor } from './tones';
import { UI_COPY } from './copy';

export interface UnitBannerProps {
  color: UnitColor;
  /** Small line above the title, e.g. "Abschnitt 1 · Einheit 2". */
  eyebrow: string;
  title: string;
  subtitle?: string;
  onGuidebookClick?: () => void;
  guidebookLabel?: string;
  /** Heading level of the title within the page outline. */
  titleAs?: 'h2' | 'h3';
  className?: string;
}

export function UnitBanner({
  color,
  eyebrow,
  title,
  subtitle,
  onGuidebookClick,
  guidebookLabel = UI_COPY.unitBanner.guidebook,
  titleAs: Title = 'h2',
  className,
}: UnitBannerProps) {
  return (
    <section
      data-tone={unitTone(color)}
      className={cx(
        'relative flex items-center gap-3 overflow-hidden rounded-card tone-solid py-4 pr-3 pl-5 edge-3d',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute -top-10 -right-6 size-32 rounded-full bg-highlight opacity-60"
      />
      <div className="relative min-w-0 flex-1">
        <p className="text-caption font-extrabold tracking-wider uppercase opacity-80">{eyebrow}</p>
        <Title className="text-lead font-black">{title}</Title>
        {subtitle && <p className="mt-0.5 text-label font-bold opacity-85">{subtitle}</p>}
      </div>
      {onGuidebookClick && (
        <button
          type="button"
          onClick={onGuidebookClick}
          aria-label={guidebookLabel}
          className="relative grid size-13 shrink-0 pressable place-items-center rounded-button border-2 border-tone-edge bg-tone-face"
        >
          <BookOpenTextIcon aria-hidden="true" size={26} weight="bold" />
        </button>
      )}
    </section>
  );
}
