import { useLocation } from 'react-router';
import { Mascot } from '../components/ui/Mascot';
import { NAV_ITEMS } from './navigation';

/** Stand-in for screens of later milestones and for unknown paths. */
export function PlaceholderPage() {
  const { pathname } = useLocation();
  const section = NAV_ITEMS.find((item) => item.to === pathname);

  return (
    <div className="flex flex-col items-center gap-4 pt-16 text-center">
      <Mascot expression={section ? 'thinking' : 'sad'} size="lg" />
      <h1 className="text-headline font-black">
        {section ? section.label : 'Seite nicht gefunden'}
      </h1>
      <p className="max-w-xs text-body text-fg-muted">
        {section
          ? 'Diese Ansicht entsteht gerade. Schau bald wieder vorbei!'
          : 'Diesen Weg gibt es nicht. Über die Navigation unten kommst du zurück.'}
      </p>
    </div>
  );
}
