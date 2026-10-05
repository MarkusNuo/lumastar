import { ArrowClockwiseIcon, SparkleIcon, TargetIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { LevelBadgePop } from '../../../components/ui/LevelBadgePop';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { PLACEMENT_COPY } from '../../../features/placement/copy';
import { SkillList } from '../../../features/placement/reveal/SkillList';
import { useRevealMoment } from '../../../lib/useRevealMoment';
import { SAMPLE_PLACEMENT_RESULT } from '../../../features/placement/samplePlacement';
import { PlanChangeList } from '../../../features/plan/PlanHistory';
import { PlanTimeline } from '../../../features/plan/PlanTimeline';
import { SAMPLE_PATH, SAMPLE_PLAN_CHANGES } from '../../../features/plan/samplePlan';
import { buildPlanTimeline } from '../../../features/plan/timeline';
import { Specimen } from '../CatalogSection';

const reveal = PLACEMENT_COPY.reveal;
// A fixed day keeps the "in ca. …" texts stable for screenshots.
const CATALOG_TODAY = new Date(2026, 9, 5);

function PoppingBadge() {
  const revealed = useRevealMoment();
  return <LevelBadgePop level="A1" sublevel={2} size="xl" revealed={revealed} />;
}

function RevealDemo() {
  const [round, setRound] = useState(0);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid h-44 place-items-center">
        <PoppingBadge key={round} />
      </div>
      <Button
        variant="neutral"
        icon={ArrowClockwiseIcon}
        onClick={() => setRound((current) => current + 1)}
      >
        Nochmals enthüllen
      </Button>
    </div>
  );
}

export function PlacementPlanSection() {
  return (
    <>
      <Specimen label="Einstufung: Fortschritt ohne Bewertung" layout="stack">
        <div className="flex items-center gap-3">
          <ProgressBar
            label="Fortschritt der Einstufung"
            value={6}
            max={20}
            valueText={PLACEMENT_COPY.test.progressValue(7, 20)}
          />
          <span className="shrink-0 text-label font-black text-fg-muted tabular-nums">
            {PLACEMENT_COPY.test.counter(7, 20)}
          </span>
        </div>
      </Specimen>
      <Specimen
        label="Niveau-Enthüllung: Abzeichen springt nach kurzer Pause herein"
        layout="stack"
      >
        <RevealDemo />
      </Specimen>
      <Specimen label="Stärken und Schwächen nach der Einstufung" layout="stack">
        <SkillList
          title={reveal.strengths}
          icon={SparkleIcon}
          tone="success"
          skills={SAMPLE_PLACEMENT_RESULT.strengths}
        />
        <SkillList
          title={reveal.weaknesses}
          icon={TargetIcon}
          tone="warning"
          skills={SAMPLE_PLACEMENT_RESULT.weaknesses}
        />
      </Specimen>
      <Specimen label="Lernplan als Zeitleiste bis C2" layout="stack">
        <PlanTimeline
          bands={buildPlanTimeline(SAMPLE_PATH)}
          targetLevel={SAMPLE_PATH.targetLevel}
          today={CATALOG_TODAY}
        />
      </Specimen>
      <Specimen label="Plan-Verlauf" layout="stack">
        <PlanChangeList changes={SAMPLE_PLAN_CHANGES} />
      </Specimen>
    </>
  );
}
