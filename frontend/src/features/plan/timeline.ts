import type { LearningPath, LearningPathUnit, Level, PlanUnitStatus } from '../../api/types';
import type { CefrLevel } from '../../components/ui/levels';
import { bandOf } from './estimates';

/*
 * The plan as a timeline up to C2 (PRD F3, 12.3): CEFR bands with their expected dates, the stages
 * and units inside, and where the learner stands.
 */

export interface TimelineUnit {
  id: string;
  title: string;
  status: PlanUnitStatus;
  focus: boolean;
  /** False while its exercises are not written yet. */
  hasContent: boolean;
  /** German reason of the plan for skipping, shortening or inserting it. */
  reason?: string;
  lessons: number;
}

export interface TimelineStage {
  level: Level;
  title: string;
  /** The learner's current stage. */
  current: boolean;
  units: TimelineUnit[];
}

export interface TimelineBand {
  band: CefrLevel;
  /** ISO day by which the band is expected to be done; absent for A0. */
  day?: string;
  current: boolean;
  /** Lessons the plan has for the band (skipped units need none) and how many are done. */
  lessons: number;
  lessonsDone: number;
  stages: TimelineStage[];
}

export function buildPlanTimeline(path: LearningPath): TimelineBand[] {
  const currentBand = bandOf(path.currentLevel);
  const bands: TimelineBand[] = [];

  for (const stage of path.stages) {
    const band = bandOf(stage.level);
    let entry = bands.at(-1);
    if (entry?.band !== band) {
      entry = {
        band,
        day: path.estimates[band],
        current: band === currentBand,
        lessons: 0,
        lessonsDone: 0,
        stages: [],
      };
      bands.push(entry);
    }
    for (const unit of stage.units) {
      entry.lessons += plannedLessons(unit);
      entry.lessonsDone += doneLessons(unit);
    }
    entry.stages.push({
      level: stage.level,
      title: stage.title,
      current: stage.level === path.currentLevel,
      units: stage.units.map(toTimelineUnit),
    });
  }
  return bands;
}

function plannedLessons(unit: LearningPathUnit): number {
  return unit.status === 'skipped' ? 0 : unit.estimatedLessons;
}

function doneLessons(unit: LearningPathUnit): number {
  if (unit.status === 'skipped') return 0;
  if (unit.status === 'completed') return unit.estimatedLessons;
  return Math.min(unit.lessonsCompleted, unit.estimatedLessons);
}

function toTimelineUnit(unit: LearningPathUnit): TimelineUnit {
  return {
    id: unit.unitId,
    title: unit.title,
    status: unit.status,
    focus: unit.focus,
    hasContent: unit.hasContent,
    reason: unit.reason,
    lessons: unit.estimatedLessons,
  };
}
