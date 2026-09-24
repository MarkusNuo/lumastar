import { NAV_ITEMS } from '../../../app/navigation';
import { BottomNav } from '../../../components/ui/BottomNav';
import { Specimen } from '../CatalogSection';

// "Lernen" points at the catalog itself so the active state is visible here.
const CATALOG_NAV_ITEMS = NAV_ITEMS.map((item, index) =>
  index === 0 ? { ...item, to: '/dev/ui', end: true } : item,
);

export function NavigationSection() {
  return (
    <Specimen label="Untere Navigation (aktiv: Lernen)" layout="stack">
      <div className="-mx-gutter">
        <BottomNav items={CATALOG_NAV_ITEMS} label="Beispielnavigation" />
      </div>
    </Specimen>
  );
}
