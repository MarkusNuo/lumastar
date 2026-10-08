import { ArrowClockwiseIcon, TrophyIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { BandBadge } from '../../../components/ui/BandBadge';
import { Button } from '../../../components/ui/Button';
import { BADGE_BANDS } from '../../../components/ui/levels';
import { PathNode } from '../../../components/ui/PathNode';
import { AccuracyGoal } from '../../../features/checkpoint/AccuracyGoal';
import { BadgeReveal } from '../../../features/checkpoint/BadgeReveal';
import { CheckpointIntroSheet } from '../../../features/checkpoint/CheckpointIntroSheet';
import { CheckpointResultScreen } from '../../../features/checkpoint/CheckpointResultScreen';
import { CHECKPOINT_COPY } from '../../../features/checkpoint/copy';
import {
  SAMPLE_CHECKPOINT_FAILED,
  SAMPLE_CHECKPOINT_LEVEL_UP,
  SAMPLE_CHECKPOINT_PASSED,
} from '../../../features/checkpoint/sampleCheckpoint';
import type { LessonResult } from '../../../features/lesson/model';
import { FocusSuggestionCard } from '../../../features/lesson/result/FocusSuggestionCard';
import { ReviewSummaryCard } from '../../../features/review/ReviewSummaryCard';
import { BadgeGrid } from '../../../features/settings/BadgesSection';
import { Specimen } from '../CatalogSection';
import { ScreenPreview } from '../ScreenPreview';

const noop = () => undefined;

const FOCUS_SUGGESTION = {
  skillTag: 'grammar.definite_article',
  label: 'Bestimmter Artikel',
  unitId: 'focus_grammar.definite_article_1',
};

const EARNED = [
  { code: 'A1', awardedAt: '2026-08-14T18:00:00Z' },
  { code: 'A2', awardedAt: '2026-10-05T09:30:00Z' },
] as const;

function CheckpointResultPreview({ label, result }: { label: string; result: LessonResult }) {
  const { checkpoint } = result;
  if (!checkpoint) return null;
  return (
    <ScreenPreview label={label}>
      {(close) => (
        <CheckpointResultScreen
          result={result}
          checkpoint={checkpoint}
          onContinue={close}
          onStartFocus={close}
        />
      )}
    </ScreenPreview>
  );
}

function IntroDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" icon={TrophyIcon} onClick={() => setOpen(true)}>
        Checkpoint-Einführung
      </Button>
      <CheckpointIntroSheet
        open={open}
        checkpoint={{ level: 'A1.2', nextLevel: 'A1.3', exerciseCount: 15, requiredAccuracy: 0.8 }}
        onStart={() => setOpen(false)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function ShiningBadge() {
  const [round, setRound] = useState(0);
  return (
    <div className="flex flex-col items-center gap-4">
      <BandBadge key={round} band="B1" size="xl" shine />
      <Button
        variant="neutral"
        icon={ArrowClockwiseIcon}
        onClick={() => setRound((current) => current + 1)}
      >
        Glanz neu starten
      </Button>
    </div>
  );
}

export function ReviewCheckpointSection() {
  return (
    <>
      <Specimen label="Wiederholen: Karten fällig" layout="stack">
        <ReviewSummaryCard
          summary={{ dueNow: 12, dueTomorrow: 8, totalCards: 54 }}
          onStart={noop}
          onLearn={noop}
        />
      </Specimen>
      <Specimen label="Alles wiederholt (kein toter Button)" layout="stack">
        <ReviewSummaryCard
          summary={{ dueNow: 0, dueTomorrow: 5, totalCards: 54 }}
          onStart={noop}
          onLearn={noop}
        />
      </Specimen>
      <Specimen label="Vor der ersten Lektion" layout="stack">
        <ReviewSummaryCard
          summary={{ dueNow: 0, dueTomorrow: 0, totalCards: 0 }}
          onStart={noop}
          onLearn={noop}
        />
      </Specimen>
      <Specimen label="Fokus-Lektion vorgeschlagen (Lektionsende)" layout="stack">
        <FocusSuggestionCard suggestion={FOCUS_SUGGESTION} onStart={noop} />
      </Specimen>
      <Specimen label="Checkpoint-Knoten: gesperrt · offen · als Nächstes · bestanden">
        <div className="grid w-full grid-cols-2 justify-items-center gap-y-16 pt-14 pb-2">
          <PathNode kind="checkpoint" status="locked" color="indigo" label="Checkpoint A2.1" />
          <PathNode kind="checkpoint" status="available" color="indigo" label="Checkpoint A1.2" />
          <PathNode
            kind="checkpoint"
            status="current"
            color="indigo"
            label="Checkpoint A1.3"
            bubbleLabel={CHECKPOINT_COPY.bubble}
          />
          <PathNode kind="checkpoint" status="completed" color="indigo" label="Checkpoint A1.1" />
        </div>
      </Specimen>
      <Specimen label="Checkpoint: Einführung und Ergebnisse (Vollbild)" layout="stack">
        <IntroDemo />
        <CheckpointResultPreview
          label="Bestanden: neues Niveau"
          result={SAMPLE_CHECKPOINT_LEVEL_UP}
        />
        <CheckpointResultPreview label="Bestanden + Abzeichen" result={SAMPLE_CHECKPOINT_PASSED} />
        <CheckpointResultPreview label="Nicht bestanden" result={SAMPLE_CHECKPOINT_FAILED} />
        <ScreenPreview label="Abzeichen-Enthüllung">
          {(close) => <BadgeReveal badges={['A2']} onContinue={close} />}
        </ScreenPreview>
      </Specimen>
      <Specimen label="Genauigkeit gegen die Bestehensgrenze" layout="stack">
        <AccuracyGoal accuracy={0.67} required={0.8} />
      </Specimen>
      <Specimen label="Niveau-Abzeichen A1 bis C2 (eigene Gestaltung)" layout="grid">
        {BADGE_BANDS.map((band) => (
          <div key={band} className="grid place-items-center">
            <BandBadge band={band} size="lg" />
          </div>
        ))}
      </Specimen>
      <Specimen label="Grössen und noch nicht verdient">
        <BandBadge band="A1" size="sm" />
        <BandBadge band="A2" size="md" />
        <BandBadge band="C1" size="md" locked />
        <BandBadge band="C2" size="lg" locked />
      </Specimen>
      <Specimen label="Frisch verdient: Glanz über dem Abzeichen" layout="stack">
        <ShiningBadge />
      </Specimen>
      <Specimen label="Abzeichen im Profil" layout="stack">
        <BadgeGrid earned={EARNED} />
      </Specimen>
    </>
  );
}
