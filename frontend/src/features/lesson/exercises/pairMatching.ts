/*
 * Matching pairs: tap a tile on one side, then its partner on the other. A correct match locks
 * both tiles, a wrong one counts as a mistake (0 mistakes = correct, 1 = almost, ≥ 2 = wrong).
 */

export type PairSide = 'left' | 'right';

export interface MatchTile {
  side: PairSide;
  /** Index of the pair the tile belongs to. */
  pair: number;
}

export interface MatchFlash {
  id: number;
  outcome: 'correct' | 'wrong';
  /** Pair index of the tapped left and right tile. */
  left: number;
  right: number;
}

export interface MatchState {
  selected: MatchTile | null;
  matched: number[];
  mistakes: number;
  /** Short highlight of the last match attempt. */
  flash: MatchFlash | null;
  nextFlashId: number;
}

export type MatchAction = { type: 'tapped'; tile: MatchTile } | { type: 'flashEnded'; id: number };

export const INITIAL_MATCH_STATE: MatchState = {
  selected: null,
  matched: [],
  mistakes: 0,
  flash: null,
  nextFlashId: 0,
};

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'tapped':
      return tap(state, action.tile);
    case 'flashEnded':
      return state.flash?.id === action.id ? { ...state, flash: null } : state;
  }
}

function tap(state: MatchState, tile: MatchTile): MatchState {
  if (state.matched.includes(tile.pair)) return state;
  const { selected } = state;
  if (!selected || selected.side === tile.side) {
    const deselect = selected?.side === tile.side && selected.pair === tile.pair;
    return { ...state, selected: deselect ? null : tile };
  }
  const left = tile.side === 'left' ? tile.pair : selected.pair;
  const right = tile.side === 'right' ? tile.pair : selected.pair;
  const correct = left === right;
  return {
    ...state,
    selected: null,
    matched: correct ? [...state.matched, left] : state.matched,
    mistakes: correct ? state.mistakes : state.mistakes + 1,
    flash: { id: state.nextFlashId, outcome: correct ? 'correct' : 'wrong', left, right },
    nextFlashId: state.nextFlashId + 1,
  };
}

export type MatchTileState = 'idle' | 'selected' | 'correct' | 'wrong' | 'matched';

export function matchTileState(state: MatchState, tile: MatchTile): MatchTileState {
  const flashed = state.flash !== null && state.flash[tile.side] === tile.pair;
  if (state.matched.includes(tile.pair)) {
    return flashed && state.flash?.outcome === 'correct' ? 'correct' : 'matched';
  }
  if (flashed && state.flash?.outcome === 'wrong') return 'wrong';
  const { selected } = state;
  return selected?.side === tile.side && selected.pair === tile.pair ? 'selected' : 'idle';
}

export function allMatched(state: MatchState, pairCount: number): boolean {
  return state.matched.length === pairCount;
}
