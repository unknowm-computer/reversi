import type { GameState, GameType } from './types.js';
import * as reversi from '../games/reversi/rules.js';
import * as gomoku from '../games/gomoku/rules.js';
import { REVERSI_CELL_COUNT } from '../games/reversi/board.js';
import { GOMOKU_CELL_COUNT } from '../games/gomoku/board.js';

export function boardCellCount(gameType: GameType = 'reversi'): number {
  return gameType === 'gomoku' ? GOMOKU_CELL_COUNT : REVERSI_CELL_COUNT;
}

export function initialState(gameId: string, gameType: GameType = 'reversi'): GameState {
  return gameType === 'gomoku' ? gomoku.initialState(gameId) : reversi.initialState(gameId);
}

export function legalMoves(state: GameState): number[] {
  if (state.result) return [];
  return state.gameType === 'gomoku'
    ? gomoku.legalMoves(state.board, state.turn)
    : reversi.legalMoves(state.board, state.turn);
}

export function applyMove(state: GameState, index: number): GameState | null {
  return state.gameType === 'gomoku' ? gomoku.applyMove(state, index) : reversi.applyMove(state, index);
}

/** Clock/penalty revisions are not moves and must not replay placement reactions. */
export function isPlacement(before: GameState, next: GameState): boolean {
  return before.gameId === next.gameId && before.gameType === next.gameType
    && next.revision === before.revision + 1 && next.lastMove !== null
    && before.board[next.lastMove] === null && next.board[next.lastMove] === before.turn;
}
