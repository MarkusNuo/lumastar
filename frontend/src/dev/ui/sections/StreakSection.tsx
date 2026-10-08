import { ArrowClockwiseIcon, FireIcon } from '@phosphor-icons/react';
import { MotionConfig } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { FreezeShield } from '../../../components/ui/FreezeShield';
import { StreakFlame } from '../../../components/ui/StreakFlame';
import { Trophy } from '../../../components/ui/Trophy';
import { StreakCalendar } from '../../../features/streak/calendar/StreakCalendar';
import { StreakCelebration } from '../../../features/streak/celebration/StreakCelebration';
import type { GoalChoice } from '../../../features/streak/goal/GoalChooser';
import { StreakGoalCard } from '../../../features/streak/goal/StreakGoalCard';
import type { CelebratedStreak, StreakOverview } from '../../../features/streak/model';
import {
  SAMPLE_EMPTY_MONTH,
  SAMPLE_STREAK,
  SAMPLE_STREAK_COLD,
  SAMPLE_STREAK_GOAL_REACHED,
} from '../../../features/streak/sampleStreak';
import { StreakDetails } from '../../../features/streak/StreakDetails';
import { StreakFreezeCard } from '../../../features/streak/StreakFreezeCard';
import { StreakHero } from '../../../features/streak/StreakHero';
import { StreakScreen } from '../../../features/streak/StreakScreen';
import { playCue } from '../../../lib/effects/playCue';
import { Specimen } from '../CatalogSection';
import { ScreenPreview } from '../ScreenPreview';

const DEMO_SAVE_MS = 600;

/** Saves nothing: the catalog has no backend, so a choice "saves" after a moment. */
function useDemoGoalChoice(): GoalChoice {
  const [state, setState] = useState<Pick<GoalChoice, 'chosen' | 'status'>>({ status: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    ...state,
    choose: (target) => {
      setState({ chosen: target, status: 'saving' });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState({ chosen: target, status: 'saved' }), DEMO_SAVE_MS);
    },
    reset: () => setState({ status: 'idle' }),
  };
}

const CELEBRATIONS: { label: string; streak: CelebratedStreak; reduced?: boolean }[] = [
  { label: 'Tag 1', streak: { previous: 0, current: 1, freezeUsed: false } },
  { label: 'Verlängert 4 → 5', streak: { previous: 4, current: 5, freezeUsed: false } },
  { label: 'Mit Streak-Schutz 7 → 9', streak: { previous: 7, current: 9, freezeUsed: true } },
  {
    label: 'Ziel erreicht 9 → 10',
    streak: {
      previous: 9,
      current: 10,
      freezeUsed: false,
      goalReached: { target: 10, options: [20, 30, 50] },
    },
  },
  {
    label: 'Reduzierte Bewegung',
    streak: {
      previous: 19,
      current: 20,
      freezeUsed: false,
      goalReached: { target: 20, options: [30, 50, 75] },
    },
    reduced: true,
  },
];

function CelebrationPreview({ streak, close }: { streak: CelebratedStreak; close: () => void }) {
  const goalChoice = useDemoGoalChoice();
  return <StreakCelebration streak={streak} goalChoice={goalChoice} onContinue={close} />;
}

/** The big flame on its own: cold, burning, and catching fire again on every tap. */
function IgnitionDemo() {
  const [round, setRound] = useState(0);
  const [lit, setLit] = useState(false);

  const ignite = () => {
    if (lit) {
      setLit(false);
      return;
    }
    setRound((current) => current + 1);
    setLit(true);
    playCue('streak');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <StreakFlame key={round} lit={lit} ignition className="size-48" />
      <Button
        variant={lit ? 'neutral' : 'warning'}
        icon={lit ? ArrowClockwiseIcon : FireIcon}
        onClick={ignite}
      >
        {lit ? 'Löschen' : 'Entfachen'}
      </Button>
    </div>
  );
}

function CalendarDemo() {
  const [month, setMonth] = useState(SAMPLE_STREAK.calendar.month);
  const calendar =
    month === SAMPLE_STREAK.calendar.month
      ? SAMPLE_STREAK.calendar
      : { ...SAMPLE_EMPTY_MONTH, month, firstDay: `${month}-01` };
  return (
    <StreakCalendar
      calendar={calendar}
      today={SAMPLE_STREAK.today}
      earliestMonth="2025-10"
      onMonthChange={setMonth}
    />
  );
}

function GoalCardDemo({ overview }: { overview: StreakOverview }) {
  const choice = useDemoGoalChoice();
  return <StreakGoalCard goal={overview.goal} streak={overview.current} choice={choice} />;
}

function StreakScreenPreview({ overview, close }: { overview: StreakOverview; close: () => void }) {
  const choice = useDemoGoalChoice();
  return (
    <StreakScreen onBack={close}>
      <StreakDetails
        overview={overview}
        earliestMonth="2025-10"
        onMonthChange={() => undefined}
        goalChoice={choice}
      />
    </StreakScreen>
  );
}

export function StreakSection() {
  return (
    <>
      <Specimen label="Streak-Feier nach dem Tagesziel (Vollbild)" layout="stack">
        {CELEBRATIONS.map(({ label, streak, reduced }) => (
          <ScreenPreview key={label} label={label}>
            {(close) => (
              <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
                <CelebrationPreview streak={streak} close={close} />
              </MotionConfig>
            )}
          </ScreenPreview>
        ))}
      </Specimen>
      <Specimen label="Flamme: entfachen · kalt · brennt">
        <IgnitionDemo />
        <StreakFlame lit={false} className="size-24" />
        <StreakFlame lit className="size-24" />
      </Specimen>
      <Specimen label="Pokal und Streak-Schutz">
        <Trophy won={false} engraving={20} className="size-20" />
        <Trophy won engraving={10} className="size-20" />
        <FreezeShield ready className="h-16 w-14" />
        <FreezeShield ready={false} className="h-16 w-14" />
      </Specimen>
      <Specimen label="Streak-Seite (Vollbild): brennt · grau · Ziel erreicht" layout="stack">
        {[
          { label: 'Streak brennt', overview: SAMPLE_STREAK },
          { label: 'Heute noch offen', overview: SAMPLE_STREAK_COLD },
          { label: 'Ziel erreicht', overview: SAMPLE_STREAK_GOAL_REACHED },
        ].map(({ label, overview }) => (
          <ScreenPreview key={label} label={label}>
            {(close) => <StreakScreenPreview overview={overview} close={close} />}
          </ScreenPreview>
        ))}
      </Specimen>
      <Specimen label="Kopf: brennt · heute noch offen" layout="stack">
        <StreakHero {...SAMPLE_STREAK} />
        <StreakHero {...SAMPLE_STREAK_COLD} />
      </Specimen>
      <Specimen
        label="Kalender: Band über zwei Wochen mit Streak-Schutz (Pfeile: leerer Monat)"
        layout="stack"
      >
        <CalendarDemo />
      </Specimen>
      <Specimen label="Streak-Ziel: unterwegs (ändern) · erreicht (nächstes wählen)" layout="stack">
        <GoalCardDemo overview={SAMPLE_STREAK} />
        <GoalCardDemo overview={SAMPLE_STREAK_GOAL_REACHED} />
      </Specimen>
      <Specimen label="Streak-Schutz: eingesetzt · bereit" layout="stack">
        <StreakFreezeCard freezes={SAMPLE_STREAK.freezes} />
        <StreakFreezeCard freezes={SAMPLE_STREAK_GOAL_REACHED.freezes} />
      </Specimen>
    </>
  );
}
