import { isPieceGame, type GameSettings, type GameState, type GameType } from './types.js';
import * as reversi from '../games/reversi/rules.js';
import * as gomoku from '../games/gomoku/rules.js';
import * as battleship from '../games/battleship/rules.js';
import * as chess from '../games/chess/rules.js';
import * as janggi from '../games/janggi/rules.js';
import { decodePieceMove, JANGGI_PASS } from './pieces.js';
import { REVERSI_CELL_COUNT } from '../games/reversi/board.js';
import { GOMOKU_CELL_COUNT } from '../games/gomoku/board.js';

export function boardCellCount(gameType: GameType = 'reversi'): number {
  if (gameType === 'battleship') return battleship.SIZE ** 2;
  return gameType === 'gomoku' ? GOMOKU_CELL_COUNT : gameType === 'janggi' ? 90 : REVERSI_CELL_COUNT;
}

export function initialState(gameId: string, gameType: GameType = 'reversi', settings?: GameSettings): GameState {
  switch (gameType) {
    case 'battleship': return battleship.initialState(gameId);
    case 'chess': return chess.initialState(gameId);
    case 'janggi': return janggi.initialState(gameId, settings);
    case 'gomoku': return gomoku.initialState(gameId);
    default: return reversi.initialState(gameId);
  }
}

export function legalMoves(state: GameState): number[] {
  if (state.result) return [];
  if (state.gameType === 'battleship') return battleship.legalMoves(state);
  if (state.gameType === 'chess') return chess.legalMoves(state);
  if (state.gameType === 'janggi') return janggi.legalMoves(state);
  return state.gameType === 'gomoku'
    ? gomoku.legalMoves(state.board, state.turn)
    : reversi.legalMoves(state.board, state.turn);
}

export function applyMove(state: GameState, index: number): GameState | null {
  if (state.result || !validMoveCode(state.gameType, index)) return null;
  if (state.gameType === 'battleship') return battleship.applyMove(state, index);
  if (state.gameType === 'chess') return chess.applyMove(state, index);
  if (state.gameType === 'janggi') return janggi.applyMove(state, index);
  return state.gameType === 'gomoku' ? gomoku.applyMove(state, index) : reversi.applyMove(state, index);
}

/** Validate the wire shape before the game-specific legality check. */
export function validMoveCode(gameType: GameType = 'reversi', code: number): boolean {
  if (!Number.isInteger(code)) return false;
  if (!isPieceGame(gameType)) return code >= 0 && code < boardCellCount(gameType);
  if (code === JANGGI_PASS) return gameType === 'janggi';
  const move = decodePieceMove(code);
  return move !== null && move.from < boardCellCount(gameType) && move.to < boardCellCount(gameType)
    && move.from !== move.to && (gameType !== 'janggi' || move.promotion === 'queen');
}

/** Clock/penalty revisions are not moves and must not replay move reactions. */
export function isPlacement(before: GameState, next: GameState): boolean {
  if (before.battleship && next.battleship) {
    return before.gameId === next.gameId && next.revision === before.revision + 1 && before.turn !== next.turn
      && next.lastMove !== null && before.battleship.shots[before.turn][next.lastMove] === null
      && next.battleship.shots[before.turn][next.lastMove] !== null;
  }
  if (isPieceGame(before.gameType)) {
    if (before.gameId !== next.gameId || before.gameType !== next.gameType || next.revision !== before.revision + 1 || before.turn === next.turn) return false;
    if (next.passed === before.turn && next.lastMove === null) return true;
    return next.lastFrom != null && next.lastMove !== null
      && before.pieces?.[next.lastFrom]?.color === before.turn && next.pieces?.[next.lastMove]?.color === before.turn;
  }
  return before.gameId === next.gameId && before.gameType === next.gameType
    && next.revision === before.revision + 1 && next.lastMove !== null
    && before.board[next.lastMove] === null && next.board[next.lastMove] === before.turn;
}
