import { Button } from '../../../components/ui/Button';
import { FocusScreen } from '../../../components/ui/FocusScreen';
import { Mascot } from '../../../components/ui/Mascot';
import { Wordmark } from '../../../components/ui/Wordmark';
import { SETUP_COPY } from '../copy';

const copy = SETUP_COPY.welcome;

export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <FocusScreen
      backdrop
      header={<Wordmark size="sm" className="mx-auto" />}
      className="items-center justify-center gap-4 pb-6 text-center"
      footer={
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" fullWidth onClick={onStart}>
            {copy.start}
          </Button>
          <p className="text-center text-caption font-bold text-fg-subtle">{copy.duration}</p>
        </div>
      }
    >
      <Mascot expression="celebrating" size="xl" />
      <h1 className="text-headline font-black">{copy.title}</h1>
      <p className="max-w-xs text-lead font-bold text-fg-muted">{copy.text}</p>
    </FocusScreen>
  );
}
