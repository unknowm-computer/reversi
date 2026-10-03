import type { Cell, Color, GameState } from '../../game/types.js';
import { opposite, score } from '../../game/state.js';
import { REVERSI_CELL_COUNT, REVERSI_SIZE } from './board.js';
const DIRECTIONS = [-1, 0, 1].flatMap(row => [-1, 0, 1].filter(col => row !== 0 || col !== 0).map(col => [row, col] as const));
export function initialState(gameId: string): GameState {
  const board: Cell[] = Array<Cell>(REVERSI_CELL_COUNT).fill(null);
  const center = REVERSI_SIZE / 2 - 1;
  board[center * REVERSI_SIZE + center] = board[(center + 1) * REVERSI_SIZE + center + 1] = 'white';
  board[center * REVERSI_SIZE + center + 1] = board[(center + 1) * REVERSI_SIZE + center] = 'black';
  return { gameType: 'reversi', gameId, revision: 0, board, turn: 'black', lastMove: null, winningLine: [], flipped: [], passed: null, result: null };
}
export function flipsFor(board: readonly Cell[], index: number, color: Color): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= REVERSI_CELL_COUNT || board[index] !== null) return [];
  const flipped: number[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    let row = Math.floor(index / REVERSI_SIZE) + dr, col = index % REVERSI_SIZE + dc;
    const line: number[] = [];
    while (row >= 0 && row < REVERSI_SIZE && col >= 0 && col < REVERSI_SIZE && board[row * REVERSI_SIZE + col] === opposite(color)) {
      line.push(row * REVERSI_SIZE + col); row += dr; col += dc;
    }
    if (line.length && row >= 0 && row < REVERSI_SIZE && col >= 0 && col < REVERSI_SIZE && board[row * REVERSI_SIZE + col] === color) flipped.push(...line);
  }
  return flipped;
}
export function legalMoves(board: readonly Cell[], color: Color): number[] {
  return board.flatMap((cell, i) => cell === null && flipsFor(board, i, color).length ? [i] : []);
}
export function applyMove(state: GameState, index: number): GameState | null {
  if (state.result) return null;
  const flipped = flipsFor(state.board, index, state.turn);
  if (!flipped.length) return null;
  const board = [...state.board];
  board[index] = state.turn;
  for (const cell of flipped) board[cell] = state.turn;
  let turn = opposite(state.turn);
  let passed: Color | null = null;
  let result: GameState['result'] = null;
  if (!legalMoves(board, turn).length) {
    if (legalMoves(board, state.turn).length) { passed = turn; turn = state.turn; }
    else {
      const counts = score(board);
      result = { winner: counts.black === counts.white ? null : counts.black > counts.white ? 'black' : 'white', reason: 'noLegalMoves' };
    }
  }
  return { ...state, board, turn, flipped, passed, result, revision: state.revision + 1, lastMove: index };
}
