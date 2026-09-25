import { useState } from 'react';
import { LESSON_COPY } from '../copy';
import { precheck } from '../evaluation/precheck';
import type { WordOrderExercise } from '../model';
import { ExerciseHeader } from './ExerciseHeader';
import { reactionOf, type ExerciseProps } from './exerciseProps';
import { PromptBubble } from './PromptBubble';
import { randomFor, scrambledIndices } from './shuffle';
import { useWordBank } from './useWordBank';
import { WordBankBoard } from './WordBankBoard';

/** Like the word bank without distractors: the sentence's own words in a scrambled order. */
export function WordOrder({
  exercise,
  verdict,
  retry,
  onAnswerChange,
  shuffleSeed,
}: ExerciseProps<WordOrderExercise>) {
  const words = exercise.tokens;
  const [bankOrder] = useState(() =>
    scrambledIndices(
      words.length,
      (order) => {
        const tokens = order.map((index) => words[index] ?? '');
        return precheck(exercise, { kind: 'tokens', tokens }).outcome === 'correct';
      },
      randomFor(shuffleSeed),
    ),
  );
  const { picked, toggle } = useWordBank(words, (tokens) =>
    onAnswerChange(tokens.length > 0 ? { kind: 'tokens', tokens } : null),
  );

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title={LESSON_COPY.instructions.word_order}
        retry={retry}
        reviewed={exercise.reviewed}
      />
      <PromptBubble prompt={exercise.prompt} verdict={verdict} />
      <WordBankBoard
        words={words}
        bankOrder={bankOrder}
        picked={picked}
        onToggle={toggle}
        reaction={reactionOf(verdict)}
        locked={verdict !== undefined}
        lang={exercise.answerLang}
      />
    </div>
  );
}
