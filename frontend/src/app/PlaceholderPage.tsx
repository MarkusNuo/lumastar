import { useLocation } from 'react-router';
import { Mascot } from '../components/ui/Mascot';
import { APP_COPY } from './copy';
import { NAV_ITEMS } from './navigation';

const copy = APP_COPY.placeholder;

/** Stand-in for tabs of later milestones and for unknown paths. */
export function PlaceholderPage() {
  const { pathname } = useLocation();
  const section = NAV_ITEMS.find((item) => item.to === pathname);

  return (
    <div className="flex flex-col items-center gap-4 pt-16 text-center">
      <Mascot expression={section ? 'thinking' : 'sad'} size="lg" />
      {section && (
        <span className="rounded-full border-2 border-primary bg-primary-surface px-3 py-1 text-micro font-extrabold tracking-wider text-primary-soft uppercase">
          {copy.badge}
        </span>
      )}
      <h1 className="text-headline font-black">{section ? section.label : copy.notFoundTitle}</h1>
      <p className="max-w-xs text-body text-fg-muted">{section ? copy.text : copy.notFoundText}</p>
    </div>
  );
}
