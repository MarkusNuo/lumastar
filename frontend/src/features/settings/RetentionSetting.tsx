import { BrainIcon, CaretDownIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { SettingRow } from '../../components/ui/ActionList';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { showToast } from '../../components/ui/toastStore';
import { cx } from '../../lib/cx';
import { PROFILE_COPY } from './copy';
import { RETENTION, settingsQuery, useSaveSettings } from './settingsApi';

const copy = PROFILE_COPY.settings.retention;

const toPercent = (retention: number) => Math.round(retention * 100);
const MIN = toPercent(RETENTION.min);
const MAX = toPercent(RETENTION.max);
const DEFAULT = toPercent(RETENTION.default);

/**
 * "Ziel-Behaltensrate" (PRD F8), an advanced setting behind a disclosure: how likely a word should
 * still be known when its FSRS review comes, 70 to 99 %.
 */
export function RetentionSetting() {
  const settings = useQuery(settingsQuery);
  const save = useSaveSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const panelId = useId();
  const explanationId = useId();

  const stored = settings.data ? toPercent(settings.data.requestRetention) : undefined;
  const value = draft ?? stored ?? DEFAULT;
  const dirty = stored !== undefined && value !== stored;

  const store = () => {
    if (!settings.data) return;
    save.mutate(
      { ...settings.data, requestRetention: value / 100 },
      {
        onSuccess: () => {
          setDraft(null);
          showToast(copy.saved(value));
        },
      },
    );
  };

  return (
    <SettingRow
      icon={BrainIcon}
      tone="unit-indigo"
      label={copy.label}
      description={copy.description}
      aside={
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          disabled={stored === undefined}
          onClick={() => setOpen((current) => !current)}
          className="-mr-2 flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-button-sm px-2 text-label font-black text-fg-muted transition-colors duration-(--duration-fast) hover:bg-surface-raised hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="sr-only">{copy.toggle}:</span>{' '}
          {stored === undefined ? '–' : copy.percent(stored)}
          <CaretDownIcon
            aria-hidden="true"
            size={18}
            weight="bold"
            className={cx('transition-transform duration-(--duration-base)', open && 'rotate-180')}
          />
        </button>
      }
    >
      {({ labelId }) =>
        open && (
          <div id={panelId} className="flex flex-col gap-3">
            <p id={explanationId} className="text-label font-bold text-fg-muted">
              {copy.explanation}
            </p>
            <p
              aria-hidden="true"
              className="text-center text-title font-black text-primary-soft tabular-nums"
            >
              {copy.percent(value)}
            </p>
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={RETENTION.step * 100}
              value={value}
              aria-labelledby={labelId}
              aria-describedby={explanationId}
              aria-valuetext={copy.percent(value)}
              disabled={save.isPending}
              onChange={(event) => setDraft(Number(event.target.value))}
              style={{ '--range-fill': `${((value - MIN) / (MAX - MIN)) * 100}%` }}
              className="range w-full"
            />
            <div
              aria-hidden="true"
              className="-mt-2 flex justify-between text-caption font-bold text-fg-subtle"
            >
              <span>{copy.less}</span>
              <span>{copy.more}</span>
            </div>
            {save.isError && <Callout tone="danger">{copy.saveFailed}</Callout>}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={!dirty}
                loading={save.isPending}
                onClick={store}
              >
                {copy.save}
              </Button>
              {value !== DEFAULT && (
                <Button variant="ghost" size="sm" onClick={() => setDraft(DEFAULT)}>
                  {copy.reset(DEFAULT)}
                </Button>
              )}
            </div>
          </div>
        )
      }
    </SettingRow>
  );
}
