import { useState } from 'react';
import { LESSON_COPY } from '../copy';
import type { TranslateWordbankExercise } from '../model';
import { ExerciseHeader } from './ExerciseHeader';
import { reactionOf, type ExerciseProps } from './exerciseProps';
import { PromptBubble } from './PromptBubble';
import { randomFor, shuffled } from './shuffle';
import { useWordBank } from './useWordBank';
import { WordBankBoard } from './WordBankBoard';

export function TranslateWordbank({
  exercise,
  verdict,
  retry,
  onAnswerChange,
  shuffleSeed,
}: ExerciseProps<TranslateWordbankExercise>) {
  const words = exercise.wordBank;
  // The content lists the solution's words first.
  const [bankOrder] = useState(() =>
    shuffled(
      words.map((_, index) => index),
      randomFor(shuffleSeed),
    ),
  );
  const { picked, toggle } = useWordBank(words, (tokens) =>
    onAnswerChange(tokens.length > 0 ? { kind: 'tokens', tokens } : null),
  );

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title={LESSON_COPY.instructions.translate_wordbank}
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
