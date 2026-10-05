import { CheckIcon, ConfettiIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ComboBadge } from '../../../components/ui/ComboBadge';
import { Mascot, type MascotExpression } from '../../../components/ui/Mascot';
import { OptionCard } from '../../../components/ui/OptionCard';
import { PathNode } from '../../../components/ui/PathNode';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Toggle } from '../../../components/ui/Toggle';
import type { Reaction } from '../../../features/lesson/exercises/exerciseProps';
import { ReactionSurface } from '../../../features/lesson/exercises/ReactionSurface';
import { isComboMilestone } from '../../../features/lesson/session/lessonQueue';
import { useCountUp } from '../../../features/lesson/result/useCountUp';
import { celebrate } from '../../../lib/celebrate';
import { FEEDBACK_CUES, type FeedbackCue } from '../../../lib/effects/cue';
import { useDevicePreferences } from '../../../lib/effects/devicePreferences';
import { canVibrate, HAPTIC_PATTERNS } from '../../../lib/effects/haptics';
import { playCue } from '../../../lib/effects/playCue';
import { Specimen } from '../CatalogSection';

const CUE_LABELS: Record<FeedbackCue, string> = {
  tap: 'Tippen',
  locked: 'Gesperrt',
  correct: 'Richtig',
  wrong: 'Falsch',
  combo: 'Combo',
  complete: 'Lektionsende',
  levelUp: 'Niveau erreicht',
};

const formatPattern = (pattern: number | number[]) => `${[pattern].flat().join(' · ')} ms`;

function DeviceToggles() {
  const preferences = useDevicePreferences();
  const vibrationAvailable = canVibrate();

  return (
    <div className="flex flex-col gap-5">
      <Toggle
        label="Töne"
        description="Gilt für dieses Gerät, wie im Profil"
        checked={preferences.sound}
        onChange={preferences.setSound}
      />
      <Toggle
        label="Vibration"
        description={
          vibrationAvailable ? 'Gilt für dieses Gerät' : 'Dieses Gerät kann nicht vibrieren'
        }
        checked={vibrationAvailable && preferences.haptics}
        onChange={preferences.setHaptics}
        disabled={!vibrationAvailable}
      />
    </div>
  );
}

function CueButtons() {
  return (
    <div className="grid w-full grid-cols-2 gap-3">
      {FEEDBACK_CUES.map((cue) => (
        <div key={cue} className="flex flex-col gap-1">
          <Button variant="neutral" size="sm" fullWidth onClick={() => playCue(cue)}>
            {CUE_LABELS[cue]}
          </Button>
          <p className="text-center text-micro font-bold text-fg-subtle">
            {formatPattern(HAPTIC_PATTERNS[cue])}
          </p>
        </div>
      ))}
    </div>
  );
}

function AnswerReactionDemo() {
  const [reaction, setReaction] = useState<{ kind: Reaction; run: number }>({
    kind: 'idle',
    run: 0,
  });
  const expression: Record<Reaction, MascotExpression> = {
    idle: 'happy',
    success: 'celebrating',
    error: 'encouraging',
  };

  const react = (kind: Reaction) => {
    setReaction(({ run }) => ({ kind, run: run + 1 }));
    if (kind !== 'idle') playCue(kind === 'success' ? 'correct' : 'wrong');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Mascot expression={expression[reaction.kind]} size="md" />
        <ReactionSurface
          key={reaction.run}
          reaction={reaction.kind}
          className="flex-1 rounded-card-sm"
        >
          <OptionCard
            label="Mirëdita"
            marker={1}
            selected={reaction.kind !== 'idle'}
            result={
              reaction.kind === 'idle'
                ? undefined
                : reaction.kind === 'success'
                  ? 'correct'
                  : 'wrong'
            }
            aria-disabled
          />
        </ReactionSurface>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="success" size="sm" icon={CheckIcon} onClick={() => react('success')}>
          Richtig
        </Button>
        <Button variant="danger" size="sm" icon={XIcon} onClick={() => react('error')}>
          Falsch
        </Button>
        <Button variant="neutral" size="sm" onClick={() => react('idle')}>
          Zurück
        </Button>
      </div>
    </div>
  );
}

const COMBO_TOTAL = 12;
/** How long the catalog shows the badge; in a lesson it stays until "Weiter". */
const COMBO_SHOWN_MS = 1600;

function ComboDemo() {
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [combo, setCombo] = useState<number | null>(null);

  useEffect(() => {
    if (combo === null) return;
    const timer = setTimeout(() => setCombo(null), COMBO_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [combo]);

  const answer = (correct: boolean) => {
    const next = correct ? streak + 1 : 0;
    setStreak(next);
    setAnswered((count) => (count >= COMBO_TOTAL ? 1 : count + 1));
    const milestone = correct && isComboMilestone(next);
    setCombo(milestone ? next : null);
    if (!correct) playCue('wrong');
    else playCue(milestone ? 'combo' : 'correct');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative pb-10">
        <ProgressBar
          label="Combo-Beispiel"
          value={answered}
          max={COMBO_TOTAL}
          burstKey={combo ?? undefined}
        />
        <ComboBadge count={combo} className="absolute inset-x-0 top-full -mt-8" />
      </div>
      <p className="text-caption font-bold text-fg-muted">
        {streak === 1 ? '1 richtige Antwort in Folge' : `${streak} richtige Antworten in Folge`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="success" size="sm" icon={CheckIcon} onClick={() => answer(true)}>
          Richtig
        </Button>
        <Button variant="danger" size="sm" icon={XIcon} onClick={() => answer(false)}>
          Falsch
        </Button>
      </div>
    </div>
  );
}

function XpCountUp({ xp }: { xp: number }) {
  const shown = useCountUp(xp);
  return <span className="text-display font-black text-xp tabular-nums">+{shown} XP</span>;
}

function LessonEndDemo() {
  const [run, setRun] = useState(0);

  const finish = () => {
    setRun((count) => count + 1);
    celebrate();
    playCue('complete');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Mascot expression={run > 0 ? 'celebrating' : 'happy'} size="lg" />
      {run > 0 && <XpCountUp key={run} xp={20} />}
      <Button variant="primary" icon={ConfettiIcon} onClick={finish}>
        Lektion abschliessen
      </Button>
    </div>
  );
}

export function JuiceSection() {
  return (
    <>
      <Specimen label="Töne und Vibration dieses Geräts" layout="stack">
        <DeviceToggles />
      </Specimen>
      <Specimen label="Eigene Klänge (Web Audio) mit Vibrationsmuster">
        <CueButtons />
      </Specimen>
      <Specimen label="Antwort: Hüpfer und Glanz · Schütteln" layout="stack">
        <AnswerReactionDemo />
      </Specimen>
      <Specimen label="Combo: 3, 5, 10 … richtig in Folge" layout="stack">
        <ComboDemo />
      </Specimen>
      <Specimen label="Lektionsende: Konfetti, Fanfare, XP zählen hoch" layout="stack">
        <LessonEndDemo />
      </Specimen>
      <Specimen label="Lernpfad-Knoten antippen: verfügbar · gesperrt">
        <div className="flex w-full justify-around pt-12 pb-4">
          <PathNode status="current" color="violet" label="Lektion 4" />
          <PathNode status="locked" color="violet" label="Lektion 5" />
        </div>
      </Specimen>
    </>
  );
}
