import type { Cell, Color, GameState, Score } from './types.js';

export const opposite = (color: Color): Color => color === 'black' ? 'white' : 'black';

export function score(board: readonly Cell[]): Score {
  const counts: Score = { black: 0, white: 0, empty: 0 };
  for (const cell of board) counts[cell ?? 'empty']++;
  return counts;
}

/** Detach nested reactive values before storing history or sending a Worker message. */
export function snapshotGameState(state: GameState): GameState {
  return {
    gameType: state.gameType ?? 'reversi',
    gameId: state.gameId,
    revision: state.revision,
    board: [...state.board],
    turn: state.turn,
    lastMove: state.lastMove,
    winningLine: [...(state.winningLine ?? [])],
    flipped: [...state.flipped],
    passed: state.passed,
    result: state.result ? { winner: state.result.winner, reason: state.result.reason } : null,
    ...(state.pieces ? { pieces: state.pieces.map(piece => piece ? { ...piece } : null) } : {}),
    ...(state.lastFrom !== undefined ? { lastFrom: state.lastFrom } : {}),
    ...(state.check !== undefined ? { check: state.check } : {}),
    ...(state.chess ? { chess: { ...state.chess, positionHistory: [...state.chess.positionHistory] } } : {}),
    ...(state.janggi ? { janggi: { ...state.janggi, positionHistory: [...state.janggi.positionHistory] } } : {}),
  };
}

export function endGame(state: GameState, loser: Color, reason: 'resign' | 'timeout' | 'disconnect'): GameState {
  return state.result ? state : {
    ...state,
    revision: state.revision + 1,
    flipped: [],
    result: { winner: opposite(loser), reason },
  };
}
