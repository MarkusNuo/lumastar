import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { LearningPath } from '../../api/types';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { MascotMessage } from '../../components/ui/MascotMessage';
import { PathNode } from '../../components/ui/PathNode';
import { cx } from '../../lib/cx';
import { useOnceWhen } from '../../lib/useOnceWhen';
import { CheckpointIntroSheet, type CheckpointIntro } from '../checkpoint/CheckpointIntroSheet';
import { checkpointRoute } from '../checkpoint/checkpointRoutes';
import { CHECKPOINT_COPY } from '../checkpoint/copy';
import { pathQuery } from '../plan/planQueries';
import { PATH_COPY } from './copy';
import {
  buildLearningPath,
  hasPlayableLesson,
  type PathCheckpointModel,
  type PathStageModel,
} from './learningPath';
import { PassedStageCard } from './PassedStageCard';
import { PlanTeaser } from './PlanTeaser';
import { UnitPath } from './UnitPath';

/** Home (Lernpfad): the personal plan from the current level to C2 with live progress. */
export function LearningPathPage() {
  const path = useQuery(pathQuery);
  useScrollToCurrentNode(path.data !== undefined);

  return (
    <div className="flex flex-col gap-10 pt-5 [&_[aria-current=step]]:scroll-clear-bars">
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
  const navigate = useNavigate();
  const [intro, setIntro] = useState<CheckpointIntro>();
  const [introOpen, setIntroOpen] = useState(false);
  const openIntro = (checkpoint: PathCheckpointModel) => {
    setIntro({
      level: checkpoint.level,
      nextLevel: checkpoint.nextLevel,
      exerciseCount: checkpoint.exerciseCount,
      requiredAccuracy: checkpoint.requiredAccuracy,
    });
    setIntroOpen(true);
  };

  return (
    <>
      <PlanTeaser path={path} />
      {path.previousStage && <PassedStageCard stage={path.previousStage} />}
      {!hasPlayableLesson(stages) && (
        <MascotMessage expression="thinking">
          <p>{PATH_COPY.waiting.title}</p>
          <p className="text-label font-bold text-fg-muted">
            {PATH_COPY.waiting.text(path.currentLevel)}
          </p>
        </MascotMessage>
      )}
      {stages.map((stage) => (
        <StageSection key={stage.level} stage={stage} onOpenCheckpoint={openIntro} />
      ))}
      <CheckpointIntroSheet
        open={introOpen}
        checkpoint={intro}
        onClose={() => setIntroOpen(false)}
        onStart={(level) => void navigate(checkpointRoute(level))}
      />
    </>
  );
}

/**
 * Opens the path at the next lesson instead of the top, so the learner sees the next step at
 * once. "nearest" leaves a node that is already in view where it is, so the plan teaser above it
 * stays visible.
 */
function useScrollToCurrentNode(ready: boolean) {
  useOnceWhen(ready, () => {
    document.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
  });
}

interface StageSectionProps {
  stage: PathStageModel;
  onOpenCheckpoint: (checkpoint: PathCheckpointModel) => void;
}

function StageSection({ stage, onOpenCheckpoint }: StageSectionProps) {
  const { checkpoint } = stage;
  // Locked ones shake their head; a passed one has nothing more to take.
  const startable = checkpoint.status === 'available' || checkpoint.status === 'current';
  return (
    <section aria-label={PATH_COPY.stage(stage.level, stage.title)} className="flex flex-col gap-8">
      <h2 className="flex items-center gap-3 text-caption font-black tracking-wider text-fg-subtle uppercase before:h-0.5 before:flex-1 before:bg-border after:h-0.5 after:flex-1 after:bg-border">
        {PATH_COPY.stage(stage.level, stage.title)}
      </h2>
      {stage.units.map((unit) => (
        <UnitPath key={unit.id} unit={unit} />
      ))}
      <div className={cx('flex justify-center pb-2', checkpoint.status === 'current' && 'pt-12')}>
        <PathNode
          kind="checkpoint"
          status={checkpoint.status}
          color={checkpoint.color}
          label={checkpoint.label}
          bubbleLabel={CHECKPOINT_COPY.bubble}
          onClick={startable ? () => onOpenCheckpoint(checkpoint) : undefined}
        />
      </div>
    </section>
  );
}
