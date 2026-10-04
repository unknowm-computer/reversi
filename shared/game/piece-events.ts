import { isPlacement } from './engine.js';
import { isPieceGame, type GameState } from './types.js';

function positionHistory(state: GameState): readonly string[] | undefined {
  return state.gameType === 'chess' ? state.chess?.positionHistory : state.janggi?.positionHistory;
}

/** Only a newly appended move may start effects; undo and reconnect snapshots stay quiet. */
export function isPieceMove(before: GameState, next: GameState): boolean {
  if (!isPieceGame(before.gameType) || !isPlacement(before, next)
    || next.lastFrom == null || next.lastMove === null) return false;
  const previous = positionHistory(before), current = positionHistory(next);
  return Boolean(previous && current && current.length === previous.length + 1
    && previous.every((position, index) => position === current[index]));
}

/** Counting the opponent's pieces also detects en passant's off-destination capture. */
export function capturedPieceCount(before: GameState, next: GameState): number {
  if (!isPieceMove(before, next)) return 0;
  const count = (state: GameState): number => state.pieces?.filter(piece => piece && piece.color !== before.turn).length ?? 0;
  return Math.max(0, count(before) - count(next));
}
