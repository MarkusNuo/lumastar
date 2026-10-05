import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import type { DueForecast } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { cx } from '../../lib/cx';
import { durations, springs } from '../../styles/motion';
import { STATS_COPY } from './copy';
import { forecastBars } from './forecast';
import { StatsSection } from './StatsSection';

const copy = STATS_COPY.forecast;

export interface ForecastCardProps {
  forecast: DueForecast;
  /** Opens the review tab; offered while something is due. */
  onReview: () => void;
}

/** The FSRS forecast (PRD F10: "morgen fällig: 34 Items") with the next 7 days as columns. */
export function ForecastCard({ forecast, onReview }: ForecastCardProps) {
  const bars = useMemo(() => forecastBars(forecast), [forecast]);

  return (
    <StatsSection title={copy.title}>
      <div className="flex flex-col gap-4 rounded-card border-2 border-border bg-surface p-4">
        <div className="flex items-end justify-between gap-3">
          <p className="flex flex-col">
            <span className="text-caption font-extrabold tracking-wide text-fg-muted uppercase">
              {copy.tomorrow}
            </span>
            <span aria-hidden="true" className="text-display font-black text-secondary">
              {forecast.dueTomorrow.toLocaleString('de-CH')}
            </span>
            <span className="sr-only">{copy.tomorrowValue(forecast.dueTomorrow)}</span>
          </p>
          <p className="pb-2 text-label font-bold text-fg-muted">{copy.dueNow(forecast.dueNow)}</p>
        </div>
        <ol aria-label={copy.chart} className="grid h-36 grid-cols-7 gap-2">
          {bars.map((bar, index) => (
            <li key={bar.date} className="flex h-full flex-col items-center gap-1">
              <span className="sr-only">{copy.bar(bar.longLabel, bar.due)}</span>
              {/* The padding keeps room for the number on the cap of the tallest bar. */}
              <div aria-hidden="true" className="w-full flex-1 pt-5">
                <div
                  style={{ '--share': `${bar.share * 100}%` }}
                  className="relative h-full border-b-2 border-border"
                >
                  <motion.span
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ ...springs.gentle, delay: index * durations.press * 0.5 }}
                    className={cx(
                      'absolute inset-x-0 bottom-0 mx-auto h-(--share) w-full max-w-6 origin-bottom rounded-t-xs bg-secondary',
                      bar.due > 0 && 'min-h-1',
                    )}
                  />
                  <span className="absolute inset-x-0 bottom-[calc(var(--share)+0.125rem)] text-center text-caption font-black text-fg tabular-nums">
                    {bar.due}
                  </span>
                </div>
              </div>
              <span
                aria-hidden="true"
                className={cx(
                  'text-micro',
                  index === 0 ? 'font-black text-fg' : 'font-bold text-fg-subtle',
                )}
              >
                {bar.label}
              </span>
            </li>
          ))}
        </ol>
        {forecast.dueNow > 0 && (
          <Button variant="secondary" icon={ArrowsClockwiseIcon} fullWidth onClick={onReview}>
            {copy.review}
          </Button>
        )}
      </div>
    </StatsSection>
  );
}
