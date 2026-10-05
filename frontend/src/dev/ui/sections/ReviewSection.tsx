import { ReviewSummaryCard } from '../../../features/review/ReviewSummaryCard';
import { Specimen } from '../CatalogSection';

const noop = () => undefined;

export function ReviewSection() {
  return (
    <>
      <Specimen label="Wiederholen: Wörter fällig" layout="stack">
        <ReviewSummaryCard
          summary={{ dueNow: 12, dueTomorrow: 8, totalCards: 54 }}
          onStart={noop}
          onLearn={noop}
        />
      </Specimen>
      <Specimen label="Alles wiederholt (kein toter Button)" layout="stack">
        <ReviewSummaryCard
          summary={{ dueNow: 0, dueTomorrow: 5, totalCards: 54 }}
          onStart={noop}
          onLearn={noop}
        />
      </Specimen>
      <Specimen label="Vor der ersten Lektion" layout="stack">
        <ReviewSummaryCard
          summary={{ dueNow: 0, dueTomorrow: 0, totalCards: 0 }}
          onStart={noop}
          onLearn={noop}
        />
      </Specimen>
    </>
  );
}
