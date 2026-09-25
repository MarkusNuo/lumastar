import { useEffect, useState } from 'react';
import { OptionCard, type OptionResult } from '../../../components/ui/OptionCard';
import { normalizeAnswer } from '../evaluation/normalize';
import type { MultipleChoiceExercise, Verdict } from '../model';
import { ExerciseHeader } from './ExerciseHeader';
import { reactionOf, type ExerciseProps } from './exerciseProps';
import { ReactionSurface } from './ReactionSurface';

function resultFor(
  choice: string,
  selected: string | null,
  verdict: Verdict | undefined,
): OptionResult | undefined {
  if (!verdict) return undefined;
  const isSolution =
    verdict.solution !== undefined && normalizeAnswer(choice) === normalizeAnswer(verdict.solution);
  if (isSolution) return 'correct';
  return choice === selected ? 'wrong' : undefined;
}

export function MultipleChoice({
  exercise,
  verdict,
  retry,
  onAnswerChange,
}: ExerciseProps<MultipleChoiceExercise>) {
  const [selected, setSelected] = useState<string | null>(null);
  const locked = verdict !== undefined;

  const select = (choice: string) => {
    if (locked) return;
    setSelected(choice);
    onAnswerChange({ kind: 'choice', choice });
  };

  // Number keys pick an option, like the numbers shown on the cards.
  useEffect(() => {
    if (locked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (typing || event.altKey || event.ctrlKey || event.metaKey) return;
      const choice = exercise.choices[Number(event.key) - 1];
      if (choice === undefined) return;
      setSelected(choice);
      onAnswerChange({ kind: 'choice', choice });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exercise.choices, locked, onAnswerChange]);

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title={exercise.prompt.text}
        titleLang={exercise.prompt.lang}
        retry={retry}
        reviewed={exercise.reviewed}
      />
      <div role="group" aria-label={exercise.prompt.text} className="flex flex-col gap-3">
        {exercise.choices.map((choice, index) => {
          const result = resultFor(choice, selected, verdict);
          return (
            <ReactionSurface
              key={choice}
              reaction={choice === selected ? reactionOf(verdict) : 'idle'}
              className="rounded-card-sm"
            >
              <OptionCard
                label={choice}
                marker={index + 1}
                selected={choice === selected}
                result={result}
                aria-disabled={locked || undefined}
                onClick={() => select(choice)}
              />
            </ReactionSurface>
          );
        })}
      </div>
    </div>
  );
}
