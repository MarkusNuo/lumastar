import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { FocusScreen } from '../components/ui/FocusScreen';
import { Mascot } from '../components/ui/Mascot';
import { APP_COPY } from './copy';

export interface ConnectionErrorScreenProps {
  onRetry: () => void;
  retrying: boolean;
}

/** Shown when the app cannot even find out whether the user is signed in. */
export function ConnectionErrorScreen({ onRetry, retrying }: ConnectionErrorScreenProps) {
  return (
    <FocusScreen
      className="items-center justify-center gap-4 text-center"
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={ArrowClockwiseIcon}
          loading={retrying}
          onClick={onRetry}
        >
          {APP_COPY.connection.retry}
        </Button>
      }
    >
      <Mascot expression="sad" size="xl" />
      <h1 className="text-headline font-black">{APP_COPY.connection.title}</h1>
      <p className="max-w-xs text-body text-fg-muted">{APP_COPY.connection.text}</p>
    </FocusScreen>
  );
}
