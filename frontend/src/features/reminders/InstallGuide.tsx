import { DeviceMobileIcon, ExportIcon, PlusSquareIcon, type Icon } from '@phosphor-icons/react';
import { useId } from 'react';
import { REMINDER_COPY } from './copy';
import { InstallIllustration } from './InstallIllustration';

const copy = REMINDER_COPY.states.install;

const STEP_ICONS: readonly Icon[] = [ExportIcon, PlusSquareIcon, DeviceMobileIcon];

/**
 * iPhone and iPad: Safari sends notifications only to apps on the home screen (iOS 16.4+), so the
 * reminders start with installing Lingora there.
 */
export function InstallGuide() {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      data-tone="secondary"
      className="flex flex-col gap-4 rounded-card tone-outline p-4"
    >
      <InstallIllustration />
      <div className="flex flex-col gap-1 text-center">
        <h2 id={titleId} className="text-lead font-black text-fg">
          {copy.title}
        </h2>
        <p className="text-label font-bold text-fg-muted">{copy.text}</p>
        <p className="text-body font-extrabold text-fg">{copy.summary}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {copy.steps.map((step, index) => {
          const StepIcon = STEP_ICONS[index] ?? DeviceMobileIcon;
          return (
            <li key={step} className="flex items-center gap-3 text-label font-bold text-fg">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-button tone-solid edge-3d"
              >
                <StepIcon size={22} weight="bold" />
              </span>
              <span className="min-w-0">
                <span className="sr-only">{`${index + 1}. `}</span>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
