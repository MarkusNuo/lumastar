import type { MasteryArea } from '../../api/types';
import { MeterBar } from '../../components/ui/MeterBar';
import { StatsSection } from './StatsSection';
import { STATS_COPY } from './copy';

const copy = STATS_COPY.mastery;

/** Average mastery per area in the API's order (Wortschatz, Grammatik, Schreiben …). */
export function MasteryCard({ areas }: { areas: readonly MasteryArea[] }) {
  return (
    <StatsSection title={copy.title}>
      <div className="flex flex-col gap-4 rounded-card border-2 border-border bg-surface p-4">
        <ul className="flex flex-col gap-4">
          {areas.map((area) => {
            const percent = area.mastery === undefined ? undefined : Math.round(area.mastery * 100);
            return (
              <li key={area.area} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-label font-extrabold text-fg">{area.label}</span>
                  <span
                    aria-hidden="true"
                    className={
                      percent === undefined
                        ? 'text-caption font-bold text-fg-subtle'
                        : 'text-label font-black whitespace-nowrap text-fg tabular-nums'
                    }
                  >
                    {percent === undefined ? copy.noData : copy.percent(percent)}
                  </span>
                </div>
                <MeterBar
                  label={area.label}
                  value={area.mastery ?? 0}
                  valueText={percent === undefined ? copy.noDataValue : copy.percent(percent)}
                />
              </li>
            );
          })}
        </ul>
        <p className="text-caption font-bold text-fg-subtle">{copy.hint}</p>
      </div>
    </StatsSection>
  );
}
