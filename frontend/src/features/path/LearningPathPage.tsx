import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import type { LearningPath } from '../../api/types';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { MascotMessage } from '../../components/ui/MascotMessage';
import { PathNode } from '../../components/ui/PathNode';
import { pathQuery } from '../plan/planQueries';
import { PATH_COPY } from './copy';
import { buildLearningPath, hasPlayableLesson, type PathStageModel } from './learningPath';
import { PlanTeaser } from './PlanTeaser';
import { UnitPath } from './UnitPath';

/** Home (Lernpfad): the personal plan from the current level to C2 with live progress (PRD 12.3). */
export function LearningPathPage() {
  const path = useQuery(pathQuery);
  useScrollToCurrentNode(path.data !== undefined);

  return (
    <div className="flex flex-col gap-10 pt-5">
      <h1 className="sr-only">{PATH_COPY.title}</h1>
      {path.data ? (
        <LearningPathStages path={path.data} />
      ) : path.isError ? (
        <LoadFailed
          message={PATH_COPY.loadFailed}
          retrying={path.isFetching}
          onRetry={() => void path.refetch()}
        />
      ) : (
        <LoadingBlock label={PATH_COPY.loading} className="h-60" />
      )}
    </div>
  );
}

function LearningPathStages({ path }: { path: LearningPath }) {
  const stages = useMemo(() => buildLearningPath(path), [path]);
  return (
    <>
      <PlanTeaser path={path} />
      {!hasPlayableLesson(stages) && (
        <MascotMessage expression="thinking">
          <p>{PATH_COPY.waiting.title}</p>
          <p className="text-label font-bold text-fg-muted">
            {PATH_COPY.waiting.text(path.currentLevel)}
          </p>
        </MascotMessage>
      )}
      {stages.map((stage) => (
        <StageSection key={stage.level} stage={stage} />
      ))}
    </>
  );
}

/** Opens the path at the next lesson instead of the top. */
function useScrollToCurrentNode(ready: boolean) {
  const scrolled = useRef(false);
  useEffect(() => {
    if (!ready || scrolled.current) return;
    scrolled.current = true;
    document.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'center' });
  }, [ready]);
}

function StageSection({ stage }: { stage: PathStageModel }) {
  const { checkpoint } = stage;
  return (
    <section aria-label={PATH_COPY.stage(stage.level, stage.title)} className="flex flex-col gap-8">
      <h2 className="flex items-center gap-3 text-caption font-black tracking-wider text-fg-subtle uppercase before:h-0.5 before:flex-1 before:bg-border after:h-0.5 after:flex-1 after:bg-border">
        {PATH_COPY.stage(stage.level, stage.title)}
      </h2>
      {stage.units.map((unit) => (
        <UnitPath key={unit.id} unit={unit} />
      ))}
      {/* The test at the end of the stage; its flow arrives with M4, until then it stays locked. */}
      <div className="flex justify-center pb-2">
        <PathNode
          kind="checkpoint"
          status={checkpoint.status}
          color={checkpoint.color}
          label={checkpoint.label}
        />
      </div>
    </section>
  );
}
