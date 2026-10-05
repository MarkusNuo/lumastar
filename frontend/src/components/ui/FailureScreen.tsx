import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { Button } from './Button';
import { FocusScreen } from './FocusScreen';
import { Mascot } from './Mascot';

export interface FailureScreenProps {
  title: string;
  text: string;
  /** Offered when trying again can help (network or server trouble). */
  retry?: { label: string; onRetry: () => void; retrying: boolean };
  backLabel: string;
  onBack: () => void;
}

/** Full-screen failure of a flow that could not start, with a way back and maybe a retry. */
export function FailureScreen({ title, text, retry, backLabel, onBack }: FailureScreenProps) {
  return (
    <FocusScreen
      className="items-center justify-center gap-4 text-center"
      footer={
        <div className="flex flex-col gap-3">
          {retry && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={ArrowClockwiseIcon}
              loading={retry.retrying}
              onClick={retry.onRetry}
            >
              {retry.label}
            </Button>
          )}
          <Button variant={retry ? 'ghost' : 'primary'} size="lg" fullWidth onClick={onBack}>
            {backLabel}
          </Button>
        </div>
      }
    >
      <Mascot expression="sad" size="xl" />
      <h1 className="text-headline font-black">{title}</h1>
      <p className="max-w-xs text-body text-fg-muted">{text}</p>
    </FocusScreen>
  );
}
