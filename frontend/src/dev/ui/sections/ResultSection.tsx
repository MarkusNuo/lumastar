import { ArrowClockwiseIcon, LightningIcon, TargetIcon, TimerIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { StatCard } from '../../../components/ui/StatCard';
import { DailyGoalCard } from '../../../features/lesson/result/DailyGoalCard';
import { useCountUp } from '../../../features/lesson/result/useCountUp';
import { Specimen } from '../CatalogSection';

function CountingXp({ xp }: { xp: number }) {
  return <>+{useCountUp(xp)}</>;
}

function ResultCardsDemo() {
  const [round, setRound] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="XP" icon={LightningIcon} tone="xp">
          <CountingXp key={round} xp={20} />
        </StatCard>
        <StatCard label="Genauigkeit" icon={TargetIcon} tone="success">
          92%
        </StatCard>
        <StatCard label="Zeit" icon={TimerIcon} tone="secondary">
          2:15
        </StatCard>
      </div>
      <Button
        variant="neutral"
        icon={ArrowClockwiseIcon}
        onClick={() => setRound((current) => current + 1)}
      >
        XP nochmals hochzählen
      </Button>
    </div>
  );
}

function ConfirmDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Lektion schliessen
      </Button>
      <ConfirmDialog
        open={open}
        title="Lektion wirklich beenden?"
        text="Dein Fortschritt in dieser Lektion geht verloren."
        cancelLabel="Weiterlernen"
        confirmLabel="Beenden"
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

function DailyGoalCardsDemo() {
  const [round, setRound] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <DailyGoalCard
        key={`open-${round}`}
        goal={{ minutesToday: 3, goalMinutes: 10, goalMet: false, justMet: false }}
      />
      <DailyGoalCard
        key={`met-${round}`}
        goal={{ minutesToday: 6, goalMinutes: 5, goalMet: true, justMet: true }}
      />
      <DailyGoalCard
        key={`earlier-${round}`}
        goal={{ minutesToday: 14, goalMinutes: 10, goalMet: true, justMet: false }}
      />
      <Button
        variant="neutral"
        icon={ArrowClockwiseIcon}
        onClick={() => setRound((current) => current + 1)}
      >
        Ringe nochmals füllen
      </Button>
    </div>
  );
}

export function ResultSection() {
  return (
    <>
      <Specimen
        label="Tagesziel nach der Lektion: offen · gerade erreicht · schon erreicht"
        layout="stack"
      >
        <DailyGoalCardsDemo />
      </Specimen>
      <Specimen label="Ergebnis-Karten: XP zählt hoch · Genauigkeit · Zeit" layout="stack">
        <ResultCardsDemo />
      </Specimen>
      <Specimen label="Einzelne Karte in weiteren Tönen">
        <StatCard label="Streak" icon={LightningIcon} tone="warning" className="w-28">
          7
        </StatCard>
        <StatCard label="Wörter" icon={TargetIcon} tone="primary" className="w-28">
          24
        </StatCard>
      </Specimen>
      <Specimen label="Bestätigen vor dem Verlassen" layout="stack">
        <ConfirmDemo />
      </Specimen>
    </>
  );
}
