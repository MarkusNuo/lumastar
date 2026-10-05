import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmphasisText } from '../../../components/ui/EmphasisText';
import type { Tone } from '../../../components/ui/tones';
import { precheck } from '../../../features/lesson/evaluation/precheck';
import { EMPTY_LEXICON } from '../../../features/lesson/evaluation/standardFormLexicon';
import { ExerciseView } from '../../../features/lesson/exercises/ExerciseView';
import type { Answer, LessonExercise, Outcome, Verdict } from '../../../features/lesson/model';
import {
  SAMPLE_FILL_GAP_CHOICES,
  SAMPLE_FILL_GAP_NASAL,
  SAMPLE_MATCH_PAIRS,
  SAMPLE_MULTIPLE_CHOICE,
  SAMPLE_TRANSLATE_FREE,
  SAMPLE_WORD_ORDER,
  SAMPLE_WORDBANK,
} from '../../../features/lesson/sampleExercises';
import { Specimen } from '../CatalogSection';

const DEMOS: { label: string; exercise: LessonExercise }[] = [
  { label: 'Multiple Choice (Tasten 1–4)', exercise: SAMPLE_MULTIPLE_CHOICE },
  { label: 'Übersetzen mit Wortbausteinen', exercise: SAMPLE_WORDBANK },
  { label: 'Freie Übersetzung mit Sonderzeichen', exercise: SAMPLE_TRANSLATE_FREE },
  { label: 'Lücke mit Auswahl', exercise: SAMPLE_FILL_GAP_CHOICES },
  { label: 'Lücke zum Tippen (probier «asht» oder «është»)', exercise: SAMPLE_FILL_GAP_NASAL },
  { label: 'Paare zuordnen (prüft sich selbst)', exercise: SAMPLE_MATCH_PAIRS },
  { label: 'Satzbausteine ordnen', exercise: SAMPLE_WORD_ORDER },
];

// Fixed tile order so the catalog (and its e2e screenshots) looks the same on every load.
const CATALOG_SHUFFLE_SEED = 2026;

const OUTCOME_DISPLAY: Record<Outcome, { tone: Tone; label: string }> = {
  correct: { tone: 'success', label: 'Richtig' },
  almost_correct: { tone: 'warning', label: 'Fast richtig' },
  correct_standard_form: { tone: 'secondary', label: 'Richtig, aber Standard' },
  wrong: { tone: 'danger', label: 'Falsch' },
};

function VerdictLine({ verdict }: { verdict: Verdict }) {
  const { tone, label } = OUTCOME_DISPLAY[verdict.outcome];
  return (
    <p data-tone={tone} className="rounded-card-sm tone-outline px-4 py-3 text-label font-bold">
      <span className="font-black">Pre-Check: {label}</span>
      {verdict.solution && verdict.outcome !== 'correct' && <> · {verdict.solution}</>}
      {verdict.hint && (
        <span className="mt-1 block text-fg">
          <EmphasisText text={verdict.hint} />
        </span>
      )}
    </p>
  );
}

/** One exercise with a local check instead of the lesson player's sheet. */
function ExerciseDemo({ exercise }: { exercise: LessonExercise }) {
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [verdict, setVerdict] = useState<Verdict>();

  // The catalog has no backend; the listed Standard forms of the samples still apply.
  const check = (value: Answer) => setVerdict(precheck(exercise, value, EMPTY_LEXICON));
  const reset = () => {
    setRound((current) => current + 1);
    setAnswer(null);
    setVerdict(undefined);
  };

  return (
    <Card variant="outline" padding="lg" className="flex flex-col gap-5">
      <ExerciseView
        key={round}
        exercise={exercise}
        retry={false}
        verdict={verdict}
        onAnswerChange={setAnswer}
        onSubmit={check}
        focusOnStart={false}
        shuffleSeed={CATALOG_SHUFFLE_SEED}
      />
      {verdict && <VerdictLine verdict={verdict} />}
      {verdict ? (
        <Button variant="neutral" fullWidth onClick={reset}>
          Nochmals
        </Button>
      ) : (
        exercise.type !== 'match_pairs' && (
          <Button
            size="lg"
            fullWidth
            disabled={!answer}
            onClick={() => {
              if (answer) check(answer);
            }}
          >
            Prüfen
          </Button>
        )
      )}
    </Card>
  );
}

export function ExercisesSection() {
  return (
    <>
      {DEMOS.map(({ label, exercise }) => (
        <Specimen key={exercise.id} label={label} layout="stack">
          <ExerciseDemo exercise={exercise} />
        </Specimen>
      ))}
    </>
  );
}
