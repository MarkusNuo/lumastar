import { LayoutGroup } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { SpecialCharBar } from '../../../components/ui/SpecialCharBar';
import { WordTile, type WordTileState } from '../../../components/ui/WordTile';
import { answerStatusClass, fieldClass } from '../../../components/ui/fieldStyles';
import { cx } from '../../../lib/cx';
import { LESSON_COPY } from '../copy';
import { GAP_MARKER, type FillGapExercise, type Lang } from '../model';
import { ExerciseHeader } from './ExerciseHeader';
import { reactionOf, type ExerciseProps, type Reaction } from './exerciseProps';
import { PromptBubble } from './PromptBubble';
import { ReactionSurface } from './ReactionSurface';
import { textStatus, toTextAnswer } from './textAnswer';

const gapTileState: Record<Reaction, WordTileState> = {
  idle: 'idle',
  success: 'correct',
  error: 'wrong',
};

export function FillGap(props: ExerciseProps<FillGapExercise>) {
  const { exercise, verdict, retry } = props;
  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title={LESSON_COPY.instructions.fill_gap}
        retry={retry}
        reviewed={exercise.reviewed}
      />
      <PromptBubble prompt={exercise.prompt} verdict={verdict} />
      {exercise.choices ? (
        <GapWithChoices {...props} choices={exercise.choices} />
      ) : (
        <TypedGap {...props} />
      )}
    </div>
  );
}

function GapSentence({ text, lang, gap }: { text: string; lang: Lang; gap: ReactNode }) {
  const [before = '', after = ''] = text.split(GAP_MARKER);
  return (
    <p lang={lang} className="text-title leading-[3.25rem] font-extrabold">
      {before}
      {gap}
      {after}
    </p>
  );
}

function GapWithChoices({
  exercise,
  verdict,
  onAnswerChange,
  choices,
}: ExerciseProps<FillGapExercise> & { choices: string[] }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const layoutPrefix = useId();
  const locked = verdict !== undefined;
  const tileId = (index: number) => `${layoutPrefix}-${index}`;

  const choose = (index: number | null) => {
    if (locked) return;
    setChosen(index);
    const choice = index === null ? undefined : choices[index];
    onAnswerChange(choice === undefined ? null : { kind: 'choice', choice });
  };

  const chosenWord = chosen === null ? undefined : choices[chosen];
  return (
    <LayoutGroup id={layoutPrefix}>
      <ReactionSurface reaction={reactionOf(verdict)} className="rounded-card">
        <GapSentence
          text={exercise.text}
          lang={exercise.answerLang}
          gap={
            <span
              role="group"
              aria-label={LESSON_COPY.gapLabel}
              className="mx-1.5 inline-flex min-h-12 min-w-20 items-end justify-center border-b-3 border-dashed border-border-strong align-bottom"
            >
              {chosen !== null && chosenWord !== undefined && (
                <WordTile
                  layoutId={tileId(chosen)}
                  lang={exercise.answerLang}
                  state={gapTileState[reactionOf(verdict)]}
                  onClick={() => choose(null)}
                >
                  {chosenWord}
                </WordTile>
              )}
            </span>
          }
        />
      </ReactionSurface>
      <div
        role="group"
        aria-label={LESSON_COPY.gapChoices}
        className="flex flex-wrap justify-center gap-2"
      >
        {choices.map((choice, index) => (
          <WordTile
            key={choice}
            layoutId={chosen === index ? undefined : tileId(index)}
            lang={exercise.answerLang}
            state={chosen === index ? 'placed' : locked ? 'disabled' : 'idle'}
            onClick={() => choose(index)}
          >
            {choice}
          </WordTile>
        ))}
      </div>
    </LayoutGroup>
  );
}

function TypedGap({ exercise, verdict, onAnswerChange }: ExerciseProps<FillGapExercise>) {
  const [text, setText] = useState('');
  const fieldRef = useRef<HTMLInputElement>(null);
  const locked = verdict !== undefined;
  const status = textStatus(verdict);

  useEffect(() => {
    fieldRef.current?.focus({ preventScroll: true });
  }, []);

  const update = (value: string) => {
    setText(value);
    onAnswerChange(toTextAnswer(value));
  };

  return (
    <div className="flex flex-col gap-4">
      <ReactionSurface reaction={reactionOf(verdict)} className="rounded-card">
        <GapSentence
          text={exercise.text}
          lang={exercise.answerLang}
          gap={
            <input
              ref={fieldRef}
              aria-label={LESSON_COPY.gapLabel}
              lang={exercise.answerLang}
              value={text}
              readOnly={locked}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => update(event.target.value)}
              // Grows with the answer so the sentence around the gap stays readable.
              style={{ width: `${Math.max(text.length, 4) + 2}ch` }}
              className={cx(
                fieldClass,
                'mx-1.5 inline-block h-12 max-w-full rounded-button-sm px-2 py-0 text-center align-baseline text-title',
                status && answerStatusClass[status],
              )}
            />
          }
        />
      </ReactionSurface>
      {exercise.answerLang === 'sq' && !locked && (
        <SpecialCharBar inputRef={fieldRef} onChange={update} />
      )}
    </div>
  );
}
