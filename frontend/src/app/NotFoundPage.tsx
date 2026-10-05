import { Mascot } from '../components/ui/Mascot';
import { APP_COPY } from './copy';

const copy = APP_COPY.notFound;

/** Unknown paths inside the app; the navigation below leads back. */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 pt-16 text-center">
      <Mascot expression="sad" size="lg" />
      <h1 className="text-headline font-black">{copy.title}</h1>
      <p className="max-w-xs text-body text-fg-muted">{copy.text}</p>
    </div>
  );
}
