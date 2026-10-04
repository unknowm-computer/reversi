import { initialState } from '../../shared/games/gomoku/rules';
import { opposite } from '../../shared/game/state';
import type { Color, GameState } from '../../shared/game/types';
import { GOMOKU_BLOCKED_DRAW_MOVES, GOMOKU_BLOCKED_WIN_MOVES } from './gomoku-blocked-sequence';

/** Rebuild the position just before the last move of the legal online test sequence. */
export function blockedGomokuPosition(bothBlocked = false, turn: Color = 'white'): { state: GameState; move: number } {
  const moves = bothBlocked ? GOMOKU_BLOCKED_DRAW_MOVES : GOMOKU_BLOCKED_WIN_MOVES;
  const state = initialState('blocked-gomoku');
  moves.slice(0, -1).forEach((index, ply) => { state.board[index] = ply % 2 === 0 ? opposite(turn) : turn; });
  state.turn = turn;
  state.revision = moves.length - 1;
  state.lastMove = moves[moves.length - 2];
  return { state, move: moves[moves.length - 1] };
}
