import { useEffect, useReducer, useState } from 'react';
import { WordTile, type WordTileState } from '../../../components/ui/WordTile';
import { cx } from '../../../lib/cx';
import { LESSON_COPY } from '../copy';
import type { Lang, MatchPairsExercise } from '../model';
import { ExerciseHeader } from './ExerciseHeader';
import type { ExerciseProps } from './exerciseProps';
import {
  allMatched,
  INITIAL_MATCH_STATE,
  matchReducer,
  matchTileState,
  type MatchTileState,
  type PairSide,
} from './pairMatching';
import { randomFor, shuffled } from './shuffle';

/** Long enough to see the colour, short enough not to slow down the next tap. */
const FLASH_MS = 450;
/** Lets the last pair lock visibly before the feedback sheet slides in. */
const FINISH_DELAY_MS = 350;

const tileState: Record<MatchTileState, WordTileState> = {
  idle: 'idle',
  selected: 'selected',
  correct: 'correct',
  wrong: 'wrong',
  matched: 'disabled',
};

const SIDES: { side: PairSide; lang: Lang; label: string }[] = [
  { side: 'left', lang: 'sq', label: LESSON_COPY.pairs.gheg },
  { side: 'right', lang: 'de', label: LESSON_COPY.pairs.german },
];

export function MatchPairs({
  exercise,
  verdict,
  retry,
  onSubmit,
  shuffleSeed,
}: ExerciseProps<MatchPairsExercise>) {
  const { pairs } = exercise;
  const [state, dispatch] = useReducer(matchReducer, INITIAL_MATCH_STATE);
  const [orders] = useState(() => {
    const indices = pairs.map((_, index) => index);
    const random = randomFor(shuffleSeed);
    return { left: shuffled(indices, random), right: shuffled(indices, random) };
  });
  const complete = allMatched(state, pairs.length);
  const locked = complete || verdict !== undefined;

  const { flash } = state;
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => dispatch({ type: 'flashEnded', id: flash.id }), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  const { wrongMatches } = state;
  useEffect(() => {
    if (!complete || verdict) return;
    // The backend tags the confused items, so it gets the texts as shown, not the indices.
    const shown = wrongMatches.map((match) => ({
      left: pairs[match.left]?.left ?? '',
      right: pairs[match.right]?.right ?? '',
    }));
    const timer = setTimeout(
      () => onSubmit({ kind: 'pairs', wrongMatches: shown }),
      FINISH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [complete, verdict, wrongMatches, pairs, onSubmit]);

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader title={exercise.prompt.text} retry={retry} reviewed={exercise.reviewed} />
      {/* One grid with subgrid columns keeps both tiles of a row equally tall when one wraps. */}
      <div
        className="grid grid-cols-2 gap-3"
        style={{ gridTemplateRows: `repeat(${pairs.length}, auto)` }}
      >
        {SIDES.map(({ side, lang, label }) => (
          <div
            key={side}
            role="group"
            aria-label={label}
            className="row-span-full grid grid-rows-subgrid"
          >
            {orders[side].map((pair) => {
              const word = side === 'left' ? pairs[pair]?.left : pairs[pair]?.right;
              const display = matchTileState(state, { side, pair });
              return (
                <WordTile
                  key={pair}
                  lang={lang}
                  state={tileState[display]}
                  pressed={display === 'selected'}
                  onClick={() => {
                    if (!locked) dispatch({ type: 'tapped', tile: { side, pair } });
                  }}
                  className={cx(
                    'min-h-16 w-full justify-center text-center',
                    display === 'matched' && 'opacity-50',
                  )}
                >
                  {word ?? ''}
                </WordTile>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
