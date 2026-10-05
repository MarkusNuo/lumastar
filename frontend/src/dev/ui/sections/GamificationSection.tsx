import { ArrowClockwiseIcon, ConfettiIcon, FireIcon, LightningIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DailyGoalRing } from '../../../components/ui/DailyGoalRing';
import { LevelBadge } from '../../../components/ui/LevelBadge';
import { CEFR_LEVELS } from '../../../components/ui/levels';
import { PopNumber } from '../../../components/ui/PopNumber';
import { StreakCounter } from '../../../components/ui/StreakCounter';
import { StreakFlare } from '../../../components/ui/StreakFlare';
import { XpCounter } from '../../../components/ui/XpCounter';
import { celebrate } from '../../../lib/celebrate';
import { playCue } from '../../../lib/effects/playCue';
import { Specimen } from '../CatalogSection';

function TopBarDemo() {
  const [streak, setStreak] = useState(12);
  const [xp, setXp] = useState(1240);

  return (
    <div className="flex flex-col gap-4">
      <Card variant="outline" padding="sm">
        <div className="flex items-center justify-between px-1">
          <LevelBadge level="A1" sublevel={2} size="sm" />
          <StreakCounter days={streak} active freezes={1} />
          <XpCounter xp={xp} />
          <DailyGoalRing progress={0.6} valueText="3 von 5 Min." />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="warning" icon={FireIcon} onClick={() => setStreak((days) => days + 1)}>
          Streak +1
        </Button>
        <Button
          variant="secondary"
          icon={LightningIcon}
          onClick={() => setXp((value) => value + 15)}
        >
          +15 XP
        </Button>
      </div>
    </div>
  );
}

/** The flame of the streak celebration: cold first, then it catches fire with the new number. */
function StreakFlareDemo() {
  const [lit, setLit] = useState(false);
  const [days, setDays] = useState(4);

  const ignite = () => {
    if (lit) {
      setLit(false);
      return;
    }
    setDays((current) => current + 1);
    setLit(true);
    playCue('streak');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <StreakFlare lit={lit} />
      <PopNumber value={days} className="text-hero font-black text-streak" />
      <Button
        variant={lit ? 'neutral' : 'warning'}
        icon={lit ? ArrowClockwiseIcon : FireIcon}
        onClick={ignite}
      >
        {lit ? 'Löschen' : 'Entzünden'}
      </Button>
    </div>
  );
}

export function GamificationSection() {
  return (
    <>
      <Specimen label="Obere Leiste: interaktiv" layout="stack">
        <TopBarDemo />
      </Specimen>
      <Specimen label="Streak: aktiv · heute noch offen · 1 Tag · mit Streak-Schutz">
        <StreakCounter days={12} active />
        <StreakCounter days={12} active={false} />
        <StreakCounter days={1} active />
        <StreakCounter days={4} active={false} freezes={1} />
      </Specimen>
      <Specimen label="Streak-Flamme lodert bei Verlängerung" layout="stack">
        <StreakFlareDemo />
      </Specimen>
      <Specimen label="Niveau A0 bis C2 (obere Leiste, Einstufung)">
        {CEFR_LEVELS.map((level) => (
          <LevelBadge key={level} level={level} />
        ))}
      </Specimen>
      <Specimen label="Grössen, Unterstufen und noch nicht erreicht">
        <LevelBadge level="A1" sublevel={1} size="sm" />
        <LevelBadge level="A1" sublevel={2} />
        <LevelBadge level="B2" sublevel={3} size="lg" />
        <LevelBadge level="C2" size="lg" />
        <LevelBadge level="C1" size="lg" locked />
      </Specimen>
      <Specimen label="Konfetti bei Abschlüssen">
        <Button variant="primary" icon={ConfettiIcon} onClick={celebrate}>
          Feiern
        </Button>
      </Specimen>
    </>
  );
}
