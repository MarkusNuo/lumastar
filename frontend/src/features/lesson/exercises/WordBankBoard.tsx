import { LayoutGroup } from 'motion/react';
import { useId } from 'react';
import { WordTile, type WordTileState } from '../../../components/ui/WordTile';
import { LESSON_COPY } from '../copy';
import type { Lang } from '../model';
import type { Reaction } from './exerciseProps';

export interface WordBankBoardProps {
  words: readonly string[];
  /** Order in which the bank shows the words (indices into `words`). */
  bankOrder: readonly number[];
  /** Indices of the words in the answer line, in answer order. */
  picked: readonly number[];
  onToggle: (index: number) => void;
  reaction: Reaction;
  locked: boolean;
  lang: Lang;
}

const answerTileState: Record<Reaction, WordTileState> = {
  idle: 'idle',
  success: 'correct',
  error: 'wrong',
};

/** Answer line above the word bank; tapped chips fly between the two. */
export function WordBankBoard({
  words,
  bankOrder,
  picked,
  onToggle,
  reaction,
  locked,
  lang,
}: WordBankBoardProps) {
  const layoutPrefix = useId();
  const tileId = (index: number) => `${layoutPrefix}-${index}`;
  const toggle = (index: number) => {
    if (!locked) onToggle(index);
  };

  return (
    <LayoutGroup id={layoutPrefix}>
      <div
        role="group"
        aria-label={LESSON_COPY.answerLine}
        className="flex min-h-30 flex-wrap content-start gap-x-2 gap-y-3 answer-lines pt-1.5"
      >
        {picked.map((index) => (
          <WordTile
            key={index}
            layoutId={tileId(index)}
            lang={lang}
            state={answerTileState[reaction]}
            onClick={() => toggle(index)}
          >
            {words[index] ?? ''}
          </WordTile>
        ))}
      </div>
      <div
        role="group"
        aria-label={LESSON_COPY.wordBank}
        className="mt-8 flex flex-wrap justify-center gap-2"
      >
        {bankOrder.map((index) => {
          const word = words[index] ?? '';
          const placed = picked.includes(index);
          return (
            <WordTile
              key={index}
              layoutId={placed ? undefined : tileId(index)}
              lang={lang}
              state={placed ? 'placed' : locked ? 'disabled' : 'idle'}
              onClick={() => toggle(index)}
            >
              {word}
            </WordTile>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
