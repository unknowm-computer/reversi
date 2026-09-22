import type { Cell, Color, GameState, Score } from './types.js';
export const opposite = (color: Color): Color => color === 'black' ? 'white' : 'black';
const DIRECTIONS = [-1, 0, 1].flatMap(row => [-1, 0, 1].filter(col => row !== 0 || col !== 0).map(col => [row, col] as const));
export function initialState(gameId: string): GameState {
  const board: Cell[] = Array<Cell>(64).fill(null);
  board[27] = board[36] = 'white'; board[28] = board[35] = 'black';
  return { gameId, revision: 0, board, turn: 'black', lastMove: null, flipped: [], passed: null, result: null };
}
export function flipsFor(board: readonly Cell[], index: number, color: Color): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= 64 || board[index] !== null) return [];
  const flipped: number[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    let row = Math.floor(index / 8) + dr, col = index % 8 + dc;
    const line: number[] = [];
    while (row >= 0 && row < 8 && col >= 0 && col < 8 && board[row * 8 + col] === opposite(color)) {
      line.push(row * 8 + col); row += dr; col += dc;
    }
    if (line.length && row >= 0 && row < 8 && col >= 0 && col < 8 && board[row * 8 + col] === color) flipped.push(...line);
  }
  return flipped;
}
export function legalMoves(board: readonly Cell[], color: Color): number[] {
  return board.flatMap((cell, i) => cell === null && flipsFor(board, i, color).length ? [i] : []);
}
export function score(board: readonly Cell[]): Score {
  const result: Score = { black: 0, white: 0, empty: 0 };
  for (const cell of board) result[cell ?? 'empty']++;
  return result;
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
export function endGame(state: GameState, loser: Color, reason: 'resign' | 'timeout' | 'disconnect'): GameState {
  return state.result ? state : { ...state, revision: state.revision + 1, flipped: [], result: { winner: opposite(loser), reason } };
}
