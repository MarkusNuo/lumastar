import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { DailyGoalRing } from '../../../components/ui/DailyGoalRing';
import { IconButton } from '../../../components/ui/IconButton';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Specimen } from '../CatalogSection';

const LESSON_LENGTH = 12;
const RING_VALUES = [0, 0.35, 0.8, 1];

function LessonProgressDemo() {
  const [done, setDone] = useState(4);
  const step = (delta: number) =>
    setDone((current) => Math.min(LESSON_LENGTH, Math.max(0, current + delta)));

  return (
    <div className="flex items-center gap-3">
      <IconButton icon={MinusIcon} label="Eine Übung zurück" size="sm" onClick={() => step(-1)} />
      <ProgressBar
        value={done}
        max={LESSON_LENGTH}
        label="Lektionsfortschritt"
        valueText={`${done} von ${LESSON_LENGTH} Übungen`}
      />
      <IconButton
        icon={PlusIcon}
        label="Eine Übung weiter"
        size="sm"
        variant="primary"
        onClick={() => step(1)}
      />
    </div>
  );
}

function GoalRingDemo() {
  const [progress, setProgress] = useState(0.4);

  return (
    <div className="flex items-center gap-4">
      <DailyGoalRing progress={progress} size="lg" />
      <div className="flex flex-col gap-2">
        <p className="text-body font-extrabold">{Math.round(progress * 100)} % vom Tagesziel</p>
        <div className="flex gap-2">
          <IconButton
            icon={MinusIcon}
            label="Weniger"
            size="sm"
            onClick={() => setProgress((value) => Math.max(0, value - 0.2))}
          />
          <IconButton
            icon={PlusIcon}
            label="Mehr"
            size="sm"
            variant="primary"
            onClick={() => setProgress((value) => Math.min(1, value + 0.2))}
          />
        </div>
      </div>
    </div>
  );
}

export function ProgressSection() {
  return (
    <>
      <Specimen label="Fortschrittsbalken: interaktiv" layout="stack">
        <LessonProgressDemo />
      </Specimen>
      <Specimen label="Farbvarianten: Aurora · Erfolg · XP" layout="stack">
        <ProgressBar value={70} label="Aurora" />
        <ProgressBar value={45} label="Erfolg" tone="success" />
        <ProgressBar value={90} label="XP" tone="xp" />
      </Specimen>
      <Specimen label="Tagesziel-Ring: 0 % · 35 % · 80 % · erreicht">
        {RING_VALUES.map((value) => (
          <DailyGoalRing key={value} progress={value} size="md" />
        ))}
      </Specimen>
      <Specimen label="Tagesziel-Ring: interaktiv" layout="stack">
        <GoalRingDemo />
      </Specimen>
    </>
  );
}
