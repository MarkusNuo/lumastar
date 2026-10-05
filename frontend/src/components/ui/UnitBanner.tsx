import { BookOpenTextIcon, type Icon } from '@phosphor-icons/react';
import { cx } from '../../lib/cx';
import { unitTone, type UnitColor } from './tones';
import { UI_COPY } from './copy';

export interface UnitBannerProps {
  color: UnitColor;
  /** Small line above the title, e.g. "Abschnitt 1 · Einheit 2". */
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Short status pill next to the eyebrow, e.g. "Übersprungen". */
  badge?: string;
  /** Not playable yet: rendered grey. */
  locked?: boolean;
  /** Decorative symbol on the right, e.g. the target of a focus unit. */
  icon?: Icon;
  onGuidebookClick?: () => void;
  guidebookLabel?: string;
  /** Heading level of the title within the page outline. */
  titleAs?: 'h2' | 'h3';
  /** Id of the title, so the surrounding unit section can be named after it. */
  titleId?: string;
  className?: string;
}

export function UnitBanner({
  color,
  eyebrow,
  title,
  subtitle,
  badge,
  locked = false,
  icon: BannerIcon,
  onGuidebookClick,
  guidebookLabel = UI_COPY.unitBanner.guidebook,
  titleAs: Title = 'h2',
  titleId,
  className,
}: UnitBannerProps) {
  return (
    <div
      data-tone={locked ? 'locked' : unitTone(color)}
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
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-extrabold tracking-wider uppercase">
          <span className="opacity-80">{eyebrow}</span>
          {badge && (
            <span className="rounded-full bg-highlight px-2 py-0.5 text-micro font-black">
              {badge}
            </span>
          )}
        </p>
        <Title id={titleId} className="text-lead font-black">
          {title}
        </Title>
        {subtitle && <p className="mt-0.5 text-label font-bold opacity-85">{subtitle}</p>}
      </div>
      {BannerIcon && (
        <BannerIcon aria-hidden="true" size={40} weight="fill" className="relative shrink-0" />
      )}
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
    </div>
  );
}
