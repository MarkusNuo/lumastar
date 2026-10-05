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
  return path.stages.map((stage) => {
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
      checkpoint: toCheckpoint(stage, units.at(-1)?.color ?? 'violet'),
    };
  });
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
    case 'planned':
      return 'locked';
  }
}

function toCheckpoint(stage: LearningPathStage, color: UnitColor): PathCheckpointModel {
  return {
    id: `checkpoint-${stage.level}`,
    status: CHECKPOINT_STATUS[stage.checkpoint.status],
    label: PATH_COPY.checkpointLabel(stage.level),
    color,
  };
}
