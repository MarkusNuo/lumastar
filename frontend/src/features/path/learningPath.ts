import type {
  CheckpointStatus,
  LearningPath,
  LearningPathStage,
  LearningPathUnit,
  Level,
} from '../../api/types';
import type { PathNodeKind, PathNodeStatus } from '../../components/ui/PathNode';
import { UNIT_COLORS, type UnitColor } from '../../components/ui/tones';
import { PATH_COPY } from './copy';

/*
 * The learning path of the home screen (PRD 12.3), built from the plan with its live progress
 * (GET /api/path): one node per planned lesson, the next lesson of the current unit pulses, the
 * lessons after it stay locked until it is done.
 */

export interface PathNodeModel {
  id: string;
  kind: Extract<PathNodeKind, 'lesson' | 'focus'>;
  status: PathNodeStatus;
  label: string;
}

/** Why a unit looks different: the plan skipped it, or its exercises are not written yet. */
export type UnitBadge = 'skipped' | 'comingSoon';

export interface PathUnitModel {
  id: string;
  title: string;
  eyebrow: string;
  color: UnitColor;
  focus: boolean;
  /** Has exercises, so its unlocked lessons can be started. */
  playable: boolean;
  badge?: UnitBadge;
  /** German reason of the plan, e.g. why the unit was skipped or inserted. */
  reason?: string;
  nodes: PathNodeModel[];
}

export interface PathCheckpointModel {
  id: string;
  level: Level;
  /** The level a pass leads to; absent for the last stage. */
  nextLevel?: Level;
  exerciseCount: number;
  requiredAccuracy: number;
  status: PathNodeStatus;
  label: string;
  color: UnitColor;
}

export interface PathStageModel {
  level: Level;
  title: string;
  units: PathUnitModel[];
  checkpoint: PathCheckpointModel;
}

/** Focus units come without a colour; the hint colour family marks them as extra practice. */
export const FOCUS_COLOR: UnitColor = 'amber';

const CHECKPOINT_STATUS: Record<CheckpointStatus, PathNodeStatus> = {
  locked: 'locked',
  available: 'available',
  passed: 'completed',
};

export function buildLearningPath(path: LearningPath): PathStageModel[] {
  let unitIndex = 0;
  const stages = path.stages.map((stage, stageIndex) => {
    let unitNumber = 0;
    const units = stage.units.map((unit) => {
      const color = unitColor(unit, unitIndex++);
      const eyebrow = unit.focus
        ? PATH_COPY.focusEyebrow
        : PATH_COPY.eyebrow(stage.level, ++unitNumber);
      return toUnit(unit, color, eyebrow);
    });
    return {
      level: stage.level,
      title: stage.title,
      units,
      checkpoint: toCheckpoint(
        stage,
        path.stages[stageIndex + 1]?.level,
        // Not the focus colour: an open checkpoint in it would look like a passed, golden one.
        units.filter((unit) => !unit.focus).at(-1)?.color ?? 'violet',
      ),
    };
  });
  return withCheckpointAsNextStep(stages);
}

function unitColor(unit: LearningPathUnit, index: number): UnitColor {
  if (unit.focus) return FOCUS_COLOR;
  const known = UNIT_COLORS.find((candidate) => candidate === unit.color);
  return known ?? UNIT_COLORS[index % UNIT_COLORS.length] ?? 'violet';
}

function toUnit(unit: LearningPathUnit, color: UnitColor, eyebrow: string): PathUnitModel {
  const lessons = Math.max(1, unit.estimatedLessons);
  const kind = unit.focus ? 'focus' : 'lesson';
  return {
    id: unit.unitId,
    title: unit.title,
    eyebrow,
    color,
    focus: unit.focus,
    playable: unit.hasContent,
    badge: unitBadge(unit),
    reason: unit.reason,
    nodes: Array.from({ length: lessons }, (_, lesson) => ({
      id: `${unit.unitId}-${lesson}`,
      kind,
      label: unit.focus
        ? PATH_COPY.focusLessonLabel(lesson + 1)
        : PATH_COPY.lessonLabel(lesson + 1),
      status: lessonStatus(unit, lesson),
    })),
  };
}

function unitBadge(unit: LearningPathUnit): UnitBadge | undefined {
  if (!unit.hasContent) return 'comingSoon';
  return unit.status === 'skipped' ? 'skipped' : undefined;
}

function lessonStatus(unit: LearningPathUnit, lesson: number): PathNodeStatus {
  if (!unit.hasContent) return 'locked';
  if (lesson < unit.lessonsCompleted) return 'completed';
  switch (unit.status) {
    case 'in_progress':
      return lesson === unit.lessonsCompleted ? 'current' : 'locked';
    // Done or skipped units stay open for practice (PRD F3: skipped units remain repeatable).
    case 'completed':
    case 'skipped':
      return 'available';
    // A focus unit is extra practice, open as soon as the plan inserts it (PRD F7).
    case 'planned':
      return unit.focus ? 'available' : 'locked';
  }
}

function toCheckpoint(
  stage: LearningPathStage,
  nextLevel: Level | undefined,
  color: UnitColor,
): PathCheckpointModel {
  return {
    id: `checkpoint-${stage.level}`,
    level: stage.level,
    nextLevel,
    exerciseCount: stage.checkpoint.exerciseCount,
    requiredAccuracy: stage.checkpoint.requiredAccuracy,
    status: CHECKPOINT_STATUS[stage.checkpoint.status],
    label: PATH_COPY.checkpointLabel(stage.level),
    color,
  };
}

/**
 * The plan's next lesson may be a focus lesson or lie in a later stage while the checkpoint of an
 * earlier one is open: then that checkpoint is the next step (it moves the learner up) and the
 * lesson stays playable. Focus lessons are extra practice, so they never hold a checkpoint back.
 */
function withCheckpointAsNextStep(stages: PathStageModel[]): PathStageModel[] {
  const open = stages.findIndex((stage) => stage.checkpoint.status === 'available');
  if (open < 0) return stages;
  const lessonFirst = stages
    .slice(0, open + 1)
    .some((stage) =>
      stage.units.some(
        (unit) => !unit.focus && unit.nodes.some((node) => node.status === 'current'),
      ),
    );
  if (lessonFirst) return stages;
  return stages.map((stage, index) => ({
    ...stage,
    checkpoint: index === open ? { ...stage.checkpoint, status: 'current' } : stage.checkpoint,
    units: stage.units.map((unit) => ({
      ...unit,
      nodes: unit.nodes.map((node) =>
        node.status === 'current' ? { ...node, status: 'available' } : node,
      ),
    })),
  }));
}

/**
 * The unit of the pulsing next lesson; undefined when the next step is a checkpoint (it needs its
 * introduction) or nothing can be started.
 */
export function nextLessonUnit(stages: readonly PathStageModel[]): string | undefined {
  return stages
    .flatMap((stage) => stage.units)
    .find((unit) => unit.nodes.some((node) => node.status === 'current'))?.id;
}

/** Whether any lesson can be started; above A2 the exercises are still being written. */
export function hasPlayableLesson(stages: readonly PathStageModel[]): boolean {
  return stages.some((stage) =>
    stage.units.some((unit) => unit.nodes.some((node) => node.status !== 'locked')),
  );
}
