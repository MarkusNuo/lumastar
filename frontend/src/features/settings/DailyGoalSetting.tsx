import { MapTrifoldIcon, TimerIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SettingRow } from '../../components/ui/ActionList';
import { Callout } from '../../components/ui/Callout';
import { LoadingBlock } from '../../components/ui/LoadState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ONBOARDING_COPY } from '../onboarding/copy';
import { onboardingOptionsQuery } from '../onboarding/onboardingApi';
import { formatDay, nextGoal, type BandEstimate } from '../plan/estimates';
import { pathQuery } from '../plan/planQueries';
import { PROFILE_COPY } from './copy';
import { settingsQuery, useSaveSettings } from './settingsApi';

const copy = PROFILE_COPY.settings.dailyGoal;
const goalCopy = ONBOARDING_COPY.dailyGoal;

/** What the plan expected before the goal changed; the new estimate follows from the fresh plan. */
interface GoalChange {
  before: BandEstimate | undefined;
}

/**
 * "Tagesziel" (PRD F1, F9): 5 to 20 minutes a day, saved at once. The plan's time estimates follow
 * the goal, so the row shows the re-estimated next band afterwards.
 */
export function DailyGoalSetting() {
  const settings = useQuery(settingsQuery);
  const options = useQuery(onboardingOptionsQuery);
  const path = useQuery(pathQuery);
  const save = useSaveSettings();
  const [change, setChange] = useState<GoalChange | null>(null);

  const stored = settings.data?.dailyGoalMinutes;
  const shown = save.isPending ? save.variables.dailyGoalMinutes : stored;

  const choose = (minutes: number) => {
    if (!settings.data || minutes === stored) return;
    const before = path.data ? nextGoal(path.data) : undefined;
    setChange(null);
    save.mutate(
      { ...settings.data, dailyGoalMinutes: minutes },
      { onSuccess: () => setChange({ before }) },
    );
  };

  return (
    <SettingRow
      icon={TimerIcon}
      tone="secondary"
      label={copy.label}
      description={shown === undefined ? undefined : goalDescription(shown)}
    >
      {({ labelId, descriptionId }) =>
        settings.data && options.data ? (
          <>
            <SegmentedControl
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              options={options.data.dailyGoalMinutes.map((minutes) => ({
                value: minutes,
                label: copy.option(minutes),
              }))}
              value={shown}
              busy={save.isPending}
              onChange={choose}
            />
            {save.isError && <Callout tone="danger">{copy.saveFailed}</Callout>}
            {change && path.data && !path.isFetching && (
              <PlanEstimateNote before={change.before} after={nextGoal(path.data)} />
            )}
          </>
        ) : (
          !settings.isError && <LoadingBlock label={copy.loading} className="h-12" />
        )
      }
    </SettingRow>
  );
}

function goalDescription(minutes: number): string {
  const name = goalCopy.names[minutes];
  return name ? `${goalCopy.minutes(minutes)} · ${name}` : goalCopy.minutes(minutes);
}

interface PlanEstimateNoteProps {
  before: BandEstimate | undefined;
  after: BandEstimate | undefined;
}

function PlanEstimateNote({ before, after }: PlanEstimateNoteProps) {
  const changed = before !== undefined && after !== undefined && before.day !== after.day;
  return (
    <p
      role="status"
      data-tone="secondary"
      className="flex items-start gap-2 rounded-card-sm tone-outline px-3 py-2 text-label font-bold"
    >
      <MapTrifoldIcon aria-hidden="true" size={20} weight="bold" className="mt-px shrink-0" />
      <span className="text-fg">
        {copy.planUpdated}
        {after && `: ${copy.estimate(after.band, formatDay(after.day))}`}
        {changed && (
          <span className="text-fg-muted"> ({copy.previously(formatDay(before.day))})</span>
        )}
      </span>
    </p>
  );
}
