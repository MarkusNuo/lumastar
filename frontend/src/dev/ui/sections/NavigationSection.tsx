import { navItems } from '../../../app/navigation';
import { BottomNav, type NavItem } from '../../../components/ui/BottomNav';
import { Specimen } from '../CatalogSection';

// "Lernen" points at the catalog itself so the active state is visible here.
function catalogItems(dueReviews: number): NavItem[] {
  return navItems(dueReviews).map((item, index) =>
    index === 0 ? { ...item, to: '/dev/ui', end: true } : item,
  );
}

export function NavigationSection() {
  return (
    <>
      <Specimen label="Untere Navigation (aktiv: Lernen)" layout="stack">
        <div className="-mx-gutter">
          <BottomNav items={catalogItems(0)} label="Beispielnavigation" />
        </div>
      </Specimen>
      <Specimen label="Fällige Wiederholungen auf dem Tab · ab 100 gekürzt" layout="stack">
        <div className="-mx-gutter flex flex-col gap-3">
          <BottomNav items={catalogItems(7)} label="Beispielnavigation mit 7 fälligen Wörtern" />
          <BottomNav
            items={catalogItems(140)}
            label="Beispielnavigation mit 140 fälligen Wörtern"
          />
        </div>
      </Specimen>
    </>
  );
}
