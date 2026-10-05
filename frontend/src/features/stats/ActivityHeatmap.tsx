import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Heatmap } from '../../api/types';
import { cx } from '../../lib/cx';
import { formatDay } from '../plan/estimates';
import { STATS_COPY } from './copy';
import { heatmapLayout, type HeatCell, type HeatLevel } from './heatmap';
import { StatsSection } from './StatsSection';

const copy = STATS_COPY.heatmap;

/*
 * One hue for the amount (green, as for a goal reached) and a hollow cell for a bridged day, so a
 * frozen day differs by shape and not only by colour.
 */
const LEVEL_CLASS: Record<HeatLevel, string> = {
  none: 'bg-surface-raised',
  practised: 'bg-success/35',
  goal: 'bg-success',
  frozen: 'border-2 border-freeze',
};

const LEVELS: readonly HeatLevel[] = ['none', 'practised', 'goal', 'frozen'];

/**
 * The learning days of the last 365 days (PRD F10). On a phone the year is wider than the
 * screen, so it scrolls sideways and opens at today; the summary line says it in words.
 */
export function ActivityHeatmap({ heatmap }: { heatmap: Heatmap }) {
  const layout = useMemo(() => heatmapLayout(heatmap), [heatmap]);
  const scroller = useRef<HTMLDivElement>(null);
  const { practised, goals, frozen } = layout.totals;

  useLayoutEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [layout]);

  return (
    <StatsSection title={copy.title} subtitle={copy.subtitle}>
      <div className="flex flex-col gap-3 rounded-card border-2 border-border bg-surface p-4">
        <p className="text-label font-bold text-fg">{copy.summary(practised, goals, frozen)}</p>
        <div aria-hidden="true" className="flex">
          <div className="flex shrink-0 flex-col gap-[calc(var(--spacing-heat-step)-var(--spacing-heat-cell))] pt-5 pr-2">
            {copy.weekdays.map((day, index) => (
              <span
                key={index}
                className="h-(--spacing-heat-cell) text-micro leading-(--spacing-heat-cell) font-bold text-fg-subtle"
              >
                {day}
              </span>
            ))}
          </div>
          <div
            ref={scroller}
            data-testid="heatmap-scroller"
            className="min-w-0 overflow-x-auto overscroll-x-contain pb-1"
          >
            {/* The right padding keeps today's outline inside the scroll area. */}
            <div className="inline-flex flex-col gap-1 pr-1">
              <div className="relative h-4">
                {layout.months.map(({ month, column }) => (
                  <span
                    key={`${month}-${column}`}
                    style={{ '--column': column }}
                    className="absolute left-[calc(var(--column)*var(--spacing-heat-step))] text-micro font-bold whitespace-nowrap text-fg-subtle"
                  >
                    {copy.months[month]}
                  </span>
                ))}
              </div>
              <div
                data-testid="heatmap-grid"
                className="grid grid-flow-col grid-rows-7 gap-[calc(var(--spacing-heat-step)-var(--spacing-heat-cell))]"
              >
                {layout.weeks
                  .flat()
                  .map((cell, index) =>
                    cell ? <DayCell key={cell.date} cell={cell} /> : <span key={`lead-${index}`} />,
                  )}
              </div>
            </div>
          </div>
        </div>
        <Legend />
      </div>
    </StatsSection>
  );
}

function DayCell({ cell }: { cell: HeatCell }) {
  return (
    <span
      data-level={cell.level}
      data-today={cell.today || undefined}
      title={copy.cell(formatDay(cell.date), cell.minutes, copy.legend[cell.level])}
      className={cx(
        'size-(--spacing-heat-cell) rounded-xs',
        LEVEL_CLASS[cell.level],
        cell.today && 'outline-2 outline-offset-1 outline-fg',
      )}
    />
  );
}

function Legend() {
  return (
    <ul
      aria-hidden="true"
      className="flex flex-wrap gap-x-4 gap-y-1 text-caption font-bold text-fg-muted"
    >
      {LEVELS.map((level) => (
        <li key={level} className="inline-flex items-center gap-1.5">
          <span className={cx('size-(--spacing-heat-cell) rounded-xs', LEVEL_CLASS[level])} />
          {copy.legend[level]}
        </li>
      ))}
    </ul>
  );
}
