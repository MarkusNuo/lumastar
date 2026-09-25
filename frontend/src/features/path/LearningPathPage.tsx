import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { LoadingDots } from '../../components/ui/LoadingDots';
import { PATH_COPY } from './copy';
import { curriculumQuery } from './curriculumQuery';
import { buildLearningPath, type PathStage } from './learningPath';
import { UnitPath } from './UnitPath';

/** Home (Lernpfad): stages from A0 to C2 with their units and lessons (PRD 12.3). */
export function LearningPathPage() {
  const curriculum = useQuery({ ...curriculumQuery, select: buildLearningPath });
  useScrollToCurrentNode(curriculum.data !== undefined);

  return (
    <div className="flex flex-col gap-10 pt-5">
      <h1 className="sr-only">{PATH_COPY.title}</h1>
      {curriculum.data ? (
        curriculum.data.map((stage) => <StageSection key={stage.level} stage={stage} />)
      ) : curriculum.isError ? (
        <div className="flex flex-col gap-3">
          <Callout tone="danger">{PATH_COPY.loadFailed}</Callout>
          <Button
            variant="neutral"
            icon={ArrowClockwiseIcon}
            loading={curriculum.isFetching}
            onClick={() => void curriculum.refetch()}
          >
            {PATH_COPY.retry}
          </Button>
        </div>
      ) : (
        <div role="status" className="grid h-60 place-items-center text-primary-soft">
          <LoadingDots />
          <span className="sr-only">{PATH_COPY.loading}</span>
        </div>
      )}
    </div>
  );
}

/** Opens the path at the next lesson instead of the first (locked) units. */
function useScrollToCurrentNode(ready: boolean) {
  const scrolled = useRef(false);
  useEffect(() => {
    if (!ready || scrolled.current) return;
    scrolled.current = true;
    document.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'center' });
  }, [ready]);
}

function StageSection({ stage }: { stage: PathStage }) {
  return (
    <section aria-label={PATH_COPY.stage(stage.level, stage.title)} className="flex flex-col gap-8">
      <h2 className="flex items-center gap-3 text-caption font-black tracking-wider text-fg-subtle uppercase before:h-0.5 before:flex-1 before:bg-border after:h-0.5 after:flex-1 after:bg-border">
        {PATH_COPY.stage(stage.level, stage.title)}
      </h2>
      {stage.units.map((unit) => (
        <UnitPath key={unit.id} unit={unit} />
      ))}
    </section>
  );
}
