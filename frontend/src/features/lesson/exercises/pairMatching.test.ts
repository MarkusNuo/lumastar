import { describe, expect, it } from 'vitest';
import {
  allMatched,
  INITIAL_MATCH_STATE,
  matchReducer,
  matchTileState,
  type MatchAction,
  type MatchState,
  type MatchTile,
} from './pairMatching';

const left = (pair: number): MatchTile => ({ side: 'left', pair });
const right = (pair: number): MatchTile => ({ side: 'right', pair });
const tap = (tile: MatchTile): MatchAction => ({ type: 'tapped', tile });

function play(...actions: MatchAction[]): MatchState {
  return actions.reduce(matchReducer, INITIAL_MATCH_STATE);
}

describe('match pairs', () => {
  it('selects the first tapped tile', () => {
    const state = play(tap(left(2)));

    expect(state.selected).toEqual(left(2));
    expect(matchTileState(state, left(2))).toBe('selected');
    expect(matchTileState(state, right(2))).toBe('idle');
  });

  it('moves the selection within one side and deselects on a second tap', () => {
    expect(play(tap(left(1)), tap(left(3))).selected).toEqual(left(3));
    expect(play(tap(left(1)), tap(left(1))).selected).toBeNull();
  });

  it('locks a correct pair, from either side', () => {
    const fromLeft = play(tap(left(0)), tap(right(0)));
    const fromRight = play(tap(right(4)), tap(left(4)));

    expect(fromLeft).toMatchObject({ matched: [0], mistakes: 0, selected: null });
    expect(fromRight).toMatchObject({ matched: [4], mistakes: 0 });
    expect(matchTileState(fromLeft, left(0))).toBe('correct');
    expect(matchTileState(fromLeft, right(0))).toBe('correct');
  });

  it('fades a matched pair once its highlight ended', () => {
    const matched = play(tap(left(0)), tap(right(0)));
    const faded = matchReducer(matched, { type: 'flashEnded', id: matched.flash?.id ?? -1 });

    expect(matchTileState(faded, left(0))).toBe('matched');
    expect(faded.flash).toBeNull();
  });

  it('counts a wrong pair as a mistake and flashes both tiles', () => {
    const state = play(tap(left(0)), tap(right(3)));

    expect(state).toMatchObject({ matched: [], mistakes: 1, selected: null });
    expect(matchTileState(state, left(0))).toBe('wrong');
    expect(matchTileState(state, right(3))).toBe('wrong');
    expect(matchTileState(state, right(0))).toBe('idle');
  });

  it('ignores an outdated end of a highlight', () => {
    const state = play(tap(left(0)), tap(right(3)), tap(left(1)), tap(right(2)));

    expect(matchReducer(state, { type: 'flashEnded', id: 0 })).toBe(state);
  });

  it('ignores taps on matched tiles', () => {
    const state = play(tap(left(0)), tap(right(0)));

    expect(matchReducer(state, tap(right(0)))).toBe(state);
  });

  it('is complete when every pair is matched, keeping the mistakes', () => {
    const state = play(
      tap(left(0)),
      tap(right(1)),
      ...[0, 1, 2, 3, 4].flatMap((pair) => [tap(left(pair)), tap(right(pair))]),
    );

    expect(allMatched(state, 5)).toBe(true);
    expect(state.mistakes).toBe(1);
    expect(allMatched(play(tap(left(0)), tap(right(0))), 5)).toBe(false);
  });
});
