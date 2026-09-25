import { useEffect, useRef, useState } from 'react';
import { AnswerTextArea } from '../../../components/ui/AnswerTextArea';
import { SpecialCharBar } from '../../../components/ui/SpecialCharBar';
import { LESSON_COPY } from '../copy';
import type { TranslateFreeExercise } from '../model';
import { ExerciseHeader } from './ExerciseHeader';
import { reactionOf, type ExerciseProps } from './exerciseProps';
import { PromptBubble } from './PromptBubble';
import { ReactionSurface } from './ReactionSurface';
import { preventLineBreak, textStatus, toTextAnswer } from './textAnswer';

export function TranslateFree({
  exercise,
  verdict,
  retry,
  onAnswerChange,
}: ExerciseProps<TranslateFreeExercise>) {
  const [text, setText] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const locked = verdict !== undefined;

  useEffect(() => {
    fieldRef.current?.focus({ preventScroll: true });
  }, []);

  const update = (value: string) => {
    setText(value);
    onAnswerChange(toTextAnswer(value));
  };

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title={LESSON_COPY.instructions.translate_free}
        retry={retry}
        reviewed={exercise.reviewed}
      />
      <PromptBubble prompt={exercise.prompt} verdict={verdict} />
      <div className="flex flex-col gap-3">
        <ReactionSurface reaction={reactionOf(verdict)} className="rounded-card">
          <AnswerTextArea
            ref={fieldRef}
            label={LESSON_COPY.answerLabel[exercise.answerLang]}
            placeholder={LESSON_COPY.answerPlaceholder[exercise.answerLang]}
            lang={exercise.answerLang}
            rows={3}
            value={text}
            status={textStatus(verdict)}
            readOnly={locked}
            onKeyDown={preventLineBreak}
            onChange={(event) => update(event.target.value)}
          />
        </ReactionSurface>
        {exercise.answerLang === 'sq' && !locked && (
          <SpecialCharBar inputRef={fieldRef} onChange={update} />
        )}
      </div>
    </div>
  );
}
