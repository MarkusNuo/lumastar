import {
  CalendarBlankIcon,
  CaretDownIcon,
  CheckIcon,
  CircleDashedIcon,
  FastForwardIcon,
  HourglassMediumIcon,
  MapPinIcon,
  PlayIcon,
  TargetIcon,
  TrophyIcon,
  type Icon,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useId, useState } from 'react';
import { LevelBadge } from '../../components/ui/LevelBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import type { Tone } from '../../components/ui/tones';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';
import { PLAN_COPY } from './copy';
import { daysUntil, formatDay } from './estimates';
import type { TimelineBand, TimelineStage, TimelineUnit } from './timeline';

const copy = PLAN_COPY;

export interface PlanTimelineProps {
  bands: TimelineBand[];
  targetLevel: string;
  /** Reference day of the "in ca. …" texts. */
  today: Date;
}

/** The plan as a vertical timeline up to C2; the current band starts expanded. */
export function PlanTimeline({ bands, targetLevel, today }: PlanTimelineProps) {
  const finalDay = bands.at(-1)?.day;
  return (
    <ol aria-label={copy.timeline} className="flex flex-col">
      {bands.map((band) => (
        <BandItem key={band.band} band={band} today={today} />
      ))}
      <li className="flex items-center gap-4">
        <span data-tone="xp" className="grid w-18 shrink-0 place-items-center" aria-hidden="true">
          <span className="grid size-14 place-items-center rounded-full tone-solid edge-3d">
            <TrophyIcon size={30} weight="fill" />
          </span>
        </span>
        <p className="flex flex-col">
          <span className="text-lead font-black text-xp">{copy.goal(targetLevel)}</span>
          {finalDay && (
            <span className="text-label font-bold text-fg-muted">
              {copy.estimate(formatDay(finalDay), daysUntil(finalDay, today))}
            </span>
          )}
        </p>
      </li>
    </ol>
  );
}

function BandItem({ band, today }: { band: TimelineBand; today: Date }) {
  const [expanded, setExpanded] = useState(band.current);
  const titleId = useId();
  const stagesId = useId();
  const unitCount = band.stages.reduce((sum, stage) => sum + stage.units.length, 0);

  return (
    <li
      aria-labelledby={titleId}
      aria-current={band.current ? 'step' : undefined}
      className="relative flex gap-4 pb-8"
    >
      {/* The rail that links the bands, behind the badges. */}
      <span
        aria-hidden="true"
        className="absolute top-4 bottom-0 left-9 w-1 -translate-x-1/2 bg-border"
      />
      <span className="relative flex w-18 shrink-0 items-start justify-center">
        <LevelBadge level={band.band} size={band.current ? 'lg' : 'md'} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={titleId} className="text-lead font-black">
            {copy.band(band.band, copy.bands[band.band])}
          </h2>
          {/* Expanded, the current stage carries the marker. */}
          {band.current && !expanded && <HereChip />}
        </div>
        {band.day && (
          <p className="flex items-center gap-1.5 text-label font-bold text-fg-muted">
            <CalendarBlankIcon aria-hidden="true" size={18} weight="bold" className="shrink-0" />
            {copy.estimate(formatDay(band.day), daysUntil(band.day, today))}
          </p>
        )}
        {band.lessons > 0 && (
          <div className="flex items-center gap-3">
            <ProgressBar
              label={copy.lessonsLabel(band.band)}
              value={band.lessonsDone}
              max={band.lessons}
              valueText={copy.lessons(band.lessonsDone, band.lessons)}
              tone="success"
              className="h-3"
            />
            <span className="shrink-0 text-caption font-extrabold text-fg-subtle tabular-nums">
              {band.lessonsDone}/{band.lessons}
            </span>
          </div>
        )}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={stagesId}
          onClick={() => setExpanded((current) => !current)}
          className="-ml-2 flex min-h-11 items-center gap-1.5 self-start rounded-button-sm px-2 text-label font-extrabold text-primary-soft hover:bg-surface"
        >
          {expanded ? copy.hideUnits : copy.showUnits(unitCount)}
          <CaretDownIcon
            aria-hidden="true"
            size={16}
            weight="bold"
            className={cx(
              'transition-transform duration-(--duration-fast)',
              expanded && 'rotate-180',
            )}
          />
        </button>
        {expanded && (
          <motion.div
            id={stagesId}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.snappy}
            className="flex flex-col gap-4"
          >
            {band.stages.map((stage) => (
              <StageBlock key={stage.level} stage={stage} />
            ))}
          </motion.div>
        )}
      </div>
    </li>
  );
}

function HereChip() {
  return (
    <span
      data-tone="primary"
      className="inline-flex items-center gap-1 rounded-full tone-solid px-2.5 py-0.5 text-micro font-black tracking-wide uppercase"
    >
      <MapPinIcon aria-hidden="true" size={14} weight="fill" />
      {copy.here}
    </span>
  );
}

function StageBlock({ stage }: { stage: TimelineStage }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cx(
        'flex flex-col gap-1 rounded-card-sm border-2 bg-surface p-3',
        stage.current ? 'border-primary' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={titleId} className="text-label font-black text-fg-muted uppercase">
          {copy.stage(stage.level, stage.title)}
        </h3>
        {stage.current && <HereChip />}
      </div>
      <ul className="flex flex-col">
        {stage.units.map((unit) => (
          <UnitRow key={unit.id} unit={unit} />
        ))}
      </ul>
    </section>
  );
}

interface UnitLook {
  icon: Icon;
  tone: Tone;
  label: string;
}

function unitLook(unit: TimelineUnit): UnitLook {
  if (!unit.hasContent)
    return { icon: HourglassMediumIcon, tone: 'locked', label: copy.comingSoon };
  const status = copy.unitStatus[unit.status];
  if (unit.focus) return { icon: TargetIcon, tone: 'warning', label: `${copy.focus} · ${status}` };
  switch (unit.status) {
    case 'completed':
      return { icon: CheckIcon, tone: 'success', label: status };
    case 'in_progress':
      return { icon: PlayIcon, tone: 'primary', label: status };
    case 'skipped':
      return { icon: FastForwardIcon, tone: 'neutral', label: status };
    case 'planned':
      return { icon: CircleDashedIcon, tone: 'neutral', label: status };
  }
}

function UnitRow({ unit }: { unit: TimelineUnit }) {
  const look = unitLook(unit);
  const UnitIcon = look.icon;
  const showLessons =
    unit.hasContent && (unit.status === 'planned' || unit.status === 'in_progress');
  const details = [look.label, showLessons ? copy.unitLessons(unit.lessons) : undefined]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden="true"
        data-tone={look.tone}
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full tone-solid"
      >
        <UnitIcon size={16} weight="bold" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={cx(
            'text-body font-extrabold',
            unit.status === 'skipped' ? 'text-fg-muted' : 'text-fg',
          )}
        >
          {unit.title}
        </span>
        <span className="text-caption font-bold text-fg-muted">{details}</span>
        {unit.reason && <span className="text-caption text-fg-subtle">{unit.reason}</span>}
      </span>
    </li>
  );
}
