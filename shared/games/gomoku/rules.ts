import { opposite } from '../../game/state.js';
import type { Cell, Color, GameState } from '../../game/types.js';
import { GOMOKU_CELL_COUNT, GOMOKU_DIRECTIONS, GOMOKU_SIZE } from './board.js';

export type GomokuForbiddenMoveReason = 'overline' | 'doubleFour' | 'doubleThree';

export function initialState(gameId: string): GameState {
  return {
    gameId, gameType: 'gomoku', revision: 0,
    board: Array<Cell>(GOMOKU_CELL_COUNT).fill(null),
    turn: 'black', lastMove: null, flipped: [], passed: null,
    winningLine: [], result: null,
  };
}

export function legalMoves(board: readonly Cell[], color: Color = 'black'): number[] {
  if (board.length !== GOMOKU_CELL_COUNT) return [];
  return board.flatMap((cell, index) => cell === null && !isForbiddenMove(board, index, color) ? [index] : []);
}

/** All connected lines through a placed stone; checking every direction catches crossing overlines. */
function connectedLines(board: readonly Cell[], index: number, color: Color): number[][] {
  const row = Math.floor(index / GOMOKU_SIZE);
  const col = index % GOMOKU_SIZE;
  return GOMOKU_DIRECTIONS.map(([dr, dc]) => {
    const before: number[] = [];
    const after: number[] = [];
    for (const direction of [-1, 1]) {
      let r = row + dr * direction;
      let c = col + dc * direction;
      while (r >= 0 && r < GOMOKU_SIZE && c >= 0 && c < GOMOKU_SIZE && board[r * GOMOKU_SIZE + c] === color) {
        (direction < 0 ? before : after).push(r * GOMOKU_SIZE + c);
        r += dr * direction;
        c += dc * direction;
      }
    }
    return [...before.reverse(), index, ...after];
  });
}

function directionalIndex(index: number, dr: number, dc: number, offset: number): number | null {
  const row = Math.floor(index / GOMOKU_SIZE) + dr * offset;
  const col = index % GOMOKU_SIZE + dc * offset;
  return row >= 0 && row < GOMOKU_SIZE && col >= 0 && col < GOMOKU_SIZE ? row * GOMOKU_SIZE + col : null;
}

/** Exact five wins over 3-3 and 4-4, but never over a six-or-more line. */
function canCompleteFive(board: Cell[], index: number, color: Color): boolean {
  board[index] = color;
  const lines = connectedLines(board, index, color);
  board[index] = null;
  return lines.some(line => line.length === 5) && lines.every(line => line.length <= 5);
}

/** Count distinct four-stone threats, including two independent fours in one direction. */
function countFours(board: Cell[], index: number, color: Color): number {
  const fours = new Set<string>();
  for (const [dr, dc] of GOMOKU_DIRECTIONS) {
    for (let start = -4; start <= 0; start++) {
      const stones: number[] = [];
      let empty: number | null = null;
      for (let offset = start; offset < start + 5; offset++) {
        const cellIndex = directionalIndex(index, dr, dc, offset);
        if (cellIndex === null) break;
        if (board[cellIndex] === color) stones.push(cellIndex);
        else if (board[cellIndex] === null) empty = cellIndex;
      }
      if (stones.length === 4 && empty !== null && canCompleteFive(board, empty, color)) {
        // An open four has two winning endpoints but the same four stones.
        fours.add(stones.join(','));
        if (fours.size >= 2) return fours.size;
      }
    }
  }
  return fours.size;
}

/** Empty intersections that extend this direction's three to an open, straight four. */
function openFourExtensions(board: Cell[], index: number, color: Color, dr: number, dc: number): number[] {
  const at = (offset: number): number | null => directionalIndex(index, dr, dc, offset);
  const extensions = new Set<number>();
  // A four containing the new stone can start up to three intersections before it.
  // The empty endpoints exclude closed threes, board edges, and existing fours.
  for (let start = -3; start <= 0; start++) {
    const before = at(start - 1);
    const after = at(start + 4);
    if (before === null || after === null || board[before] !== null || board[after] !== null) continue;
    let empty: number | null = null;
    let stones = 0;
    for (let offset = start; offset < start + 4; offset++) {
      const cellIndex = at(offset)!;
      if (board[cellIndex] === color) stones++;
      else if (board[cellIndex] === null) empty = cellIndex;
    }
    if (stones === 3 && empty !== null) {
      board[empty] = color;
      // Both endpoints must remain legal exact-five wins; an overline is not an open end.
      const bothEndsWin = canCompleteFive(board, before, color) && canCompleteFive(board, after, color);
      board[empty] = null;
      if (bothEndsWin) extensions.add(empty);
    }
  }
  return [...extensions];
}

/** The board already contains the proposed stone; temporary extensions are restored. */
function createsDoubleThree(board: Cell[], index: number, color: Color): boolean {
  const possibleThrees = GOMOKU_DIRECTIONS.map(([dr, dc]) => openFourExtensions(board, index, color, dr, dc))
    .filter(extensions => extensions.length > 0);
  if (possibleThrees.length < 2) return false;

  let openThrees = 0;
  for (const extensions of possibleThrees) {
    const canExtend = extensions.some(extension => {
      board[extension] = color;
      // A geometric three is not open if every extension is itself forbidden.
      // Completing five on another line also ends play instead of creating an open four.
      // Each recursive step fills an empty point, so this check terminates naturally.
      const completesFive = connectedLines(board, extension, color).some(line => line.length === 5);
      const forbidden = completesFive ? null : forbiddenReasonAfterPlacement(board, extension, color);
      board[extension] = null;
      return !completesFive && forbidden === null;
    });
    // Both endpoints (and broken-three alternatives) in one direction count once.
    if (canExtend && ++openThrees >= 2) return true;
  }
  return false;
}

/** The board includes the candidate stone; all temporary threat probes restore it. */
function forbiddenReasonAfterPlacement(board: Cell[], index: number, color: Color): GomokuForbiddenMoveReason | null {
  const lines = connectedLines(board, index, color);
  if (lines.some(line => line.length >= 6)) return 'overline';
  if (lines.some(line => line.length === 5)) return null;
  if (countFours(board, index, color) >= 2) return 'doubleFour';
  return createsDoubleThree(board, index, color) ? 'doubleThree' : null;
}

/** The same overline, double-four and double-three restrictions apply to both colors. */
export function getForbiddenMoveReason(board: readonly Cell[], index: number, color: Color): GomokuForbiddenMoveReason | null {
  if (board.length !== GOMOKU_CELL_COUNT || !Number.isInteger(index)
    || index < 0 || index >= GOMOKU_CELL_COUNT || board[index] !== null) return null;
  const next = [...board];
  next[index] = color;
  return forbiddenReasonAfterPlacement(next, index, color);
}

export function isForbiddenMove(board: readonly Cell[], index: number, color: Color): boolean {
  return getForbiddenMoveReason(board, index, color) !== null;
}

export function applyMove(state: GameState, index: number): GameState | null {
  if (state.result || state.board.length !== GOMOKU_CELL_COUNT || !Number.isInteger(index)
    || index < 0 || index >= GOMOKU_CELL_COUNT || state.board[index] !== null) return null;
  if (isForbiddenMove(state.board, index, state.turn)) return null;
  const board = [...state.board];
  board[index] = state.turn;
  const winningLine = connectedLines(board, index, state.turn).find(line => line.length === 5) ?? [];
  const result: GameState['result'] = winningLine.length
    ? { winner: state.turn, reason: 'fiveInRow' }
    : board.every(cell => cell !== null) ? { winner: null, reason: 'boardFull' } : null;
  return {
    ...state, board, turn: opposite(state.turn), revision: state.revision + 1,
    lastMove: index, flipped: [], passed: null, winningLine, result,
  };
}
