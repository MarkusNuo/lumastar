import type { Curriculum } from '../../api/types';
import type { PathNodeStatus } from '../../components/ui/PathNode';
import { UNIT_COLORS, type UnitColor } from '../../components/ui/tones';
import { PATH_COPY } from './copy';

/*
 * Learning path built from the curriculum alone. Every unit with exercises can be played, the
 * first of them is "current". The personal plan and real progress replace this in M3.
 */

export interface PathNodeModel {
  id: string;
  status: PathNodeStatus;
  label: string;
}

export interface PathUnit {
  id: string;
  title: string;
  description?: string;
  eyebrow: string;
  color: UnitColor;
  playable: boolean;
  nodes: PathNodeModel[];
}

export interface PathStage {
  level: string;
  title: string;
  units: PathUnit[];
}

const DEFAULT_LESSONS = 3;
const MAX_NODES = 5;

function nodeCount(estimatedLessons: number | undefined): number {
  return Math.min(MAX_NODES, Math.max(1, estimatedLessons ?? DEFAULT_LESSONS));
}

function unitColor(color: string | undefined, index: number): UnitColor {
  const known = UNIT_COLORS.find((candidate) => candidate === color);
  return known ?? UNIT_COLORS[index % UNIT_COLORS.length] ?? 'violet';
}

export function buildLearningPath(curriculum: Curriculum): PathStage[] {
  const firstPlayable = curriculum.stages
    .flatMap((stage) => stage.units)
    .find((unit) => unit.hasContent)?.id;
  let unitIndex = 0;

  return curriculum.stages.map((stage) => ({
    level: stage.level,
    title: stage.title,
    units: stage.units.map((unit, indexInStage) => {
      const color = unitColor(unit.color, unitIndex++);
      return {
        id: unit.id,
        title: unit.title,
        description: unit.description,
        eyebrow: PATH_COPY.eyebrow(stage.level, indexInStage + 1),
        color,
        playable: unit.hasContent,
        nodes: Array.from({ length: nodeCount(unit.estimatedLessons) }, (_, lesson) => ({
          id: `${unit.id}-${lesson}`,
          label: PATH_COPY.lessonLabel(lesson + 1),
          status: nodeStatus(unit.hasContent, unit.id === firstPlayable && lesson === 0),
        })),
      };
    }),
  }));
}

function nodeStatus(playable: boolean, current: boolean): PathNodeStatus {
  if (!playable) return 'locked';
  return current ? 'current' : 'available';
}
