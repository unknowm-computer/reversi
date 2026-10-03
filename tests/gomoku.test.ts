import { describe, expect, it, vi } from 'vitest';
import { GOMOKU_CELL_COUNT, GOMOKU_SIZE, gomokuCoordinate } from '../shared/games/gomoku/board';
import { applyMove, getForbiddenMoveReason, initialState, isForbiddenMove, legalMoves } from '../shared/games/gomoku/rules';
import { chooseDifficultyMove } from '../shared/games/gomoku/ai';
import type { Cell, Color, GameState } from '../shared/game/types';

const point = (row: number, col: number): number => row * GOMOKU_SIZE + col;
function position(stones: ReadonlyArray<readonly [number, number, Color]>, turn: Color = 'black'): GameState {
  const state = initialState('gomoku');
  state.turn = turn;
  for (const [row, col, color] of stones) state.board[point(row, col)] = color;
  return state;
}

describe('Gomoku rules', () => {
  it('starts with an empty 15 × 15 board and black to move', () => {
    const state = initialState('start');
    expect(state.gameType).toBe('gomoku');
    expect(state.board).toEqual(Array<Cell>(GOMOKU_CELL_COUNT).fill(null));
    expect(state.turn).toBe('black');
    expect(state.winningLine).toEqual([]);
    expect(legalMoves(state.board)).toHaveLength(225);
    expect(gomokuCoordinate(0)).toBe('A1');
    expect(gomokuCoordinate(224)).toBe('O15');
  });

  it('places one stone, alternates turns, and preserves the previous state', () => {
    const state = initialState('move');
    const next = applyMove(state, point(7, 7))!;
    expect(next.board[point(7, 7)]).toBe('black');
    expect(next.board.filter(Boolean)).toHaveLength(1);
    expect(next.turn).toBe('white');
    expect(next.revision).toBe(1);
    expect(next.lastMove).toBe(point(7, 7));
    expect(next.flipped).toEqual([]);
    expect(next.passed).toBeNull();
    expect(state.board[point(7, 7)]).toBeNull();
    expect(state.revision).toBe(0);
    expect(applyMove(next, point(0, 0))!.board[0]).toBe('white');
  });

  it.each([[0, 1], [1, 0], [1, 1], [1, -1]] as const)('wins in direction (%s, %s) and records the complete line', (dr, dc) => {
    const state = initialState('win');
    const line = Array.from({ length: 5 }, (_, step) => point(4 + dr * step, 7 + dc * step));
    for (const index of line.slice(0, 4)) state.board[index] = 'black';
    const next = applyMove(state, line[4])!;
    expect(next.result).toEqual({ winner: 'black', reason: 'fiveInRow' });
    expect(next.winningLine).toEqual(line);
    expect(applyMove(next, 0)).toBeNull();
  });

  it.each(['black', 'white'] as const)('forbids six and seven in a row in every direction for %s without mutation', color => {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]] as const) {
      for (const offsets of [[-3, -2, -1, 1, 2], [-3, -2, -1, 1, 2, 3]]) {
        const state = position(offsets.map(offset => [7 + dr * offset, 7 + dc * offset, color] as const), color);
        const before = JSON.stringify(state);
        expect(getForbiddenMoveReason(Object.freeze([...state.board]), point(7, 7), color)).toBe('overline');
        expect(isForbiddenMove(state.board, point(7, 7), color)).toBe(true);
        expect(legalMoves(state.board, color)).not.toContain(point(7, 7));
        expect(applyMove(state, point(7, 7))).toBeNull();
        expect(JSON.stringify(state)).toBe(before);
      }
    }
  });

  it.each(['black', 'white'] as const)('rejects an overline at an edge while allowing an exact five there for %s', color => {
    const overline = position([0, 1, 3, 4, 5].map(col => [0, col, color] as const), color);
    expect(getForbiddenMoveReason(overline.board, point(0, 2), color)).toBe('overline');
    expect(applyMove(overline, point(0, 2))).toBeNull();
    overline.board[point(0, 5)] = null;
    expect(getForbiddenMoveReason(overline.board, point(0, 2), color)).toBeNull();
    expect(applyMove(overline, point(0, 2))!.winningLine).toEqual([0, 1, 2, 3, 4]);
  });

  it.each(['black', 'white'] as const)('gives an overline precedence over a crossing exact five for %s', color => {
    // Horizontal five is visited before the vertical overline, so all directions must be checked.
    const state = position([
      ...[3, 4, 5, 6].map(col => [7, col, color] as const),
      ...[4, 5, 6, 8, 9].map(row => [row, 7, color] as const),
    ], color);
    expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBe('overline');
    expect(applyMove(state, point(7, 7))).toBeNull();
  });

  it('does not join rows or jump over empty intersections', () => {
    const state = initialState('boundaries');
    for (const index of [13, 14, 15, 16]) state.board[index] = 'black';
    expect(applyMove(state, 17)!.result).toBeNull();
    const broken = position([2, 3, 5, 6].map(col => [7, col, 'black'] as const));
    expect(applyMove(broken, point(7, 7))!.result).toBeNull();
  });

  it.each(['black', 'white'] as const)('forbids horizontal and vertical double threes for %s without mutation', color => {
    const state = position([[7, 6, color], [7, 8, color], [6, 7, color], [8, 7, color]], color);
    const before = JSON.stringify(state);
    expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBe('doubleThree');
    expect(isForbiddenMove(Object.freeze([...state.board]), point(7, 7), color)).toBe(true);
    expect(legalMoves(state.board, color)).not.toContain(point(7, 7));
    expect(applyMove(state, point(7, 7))).toBeNull();
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each(['black', 'white'] as const)('forbids double threes on both diagonals for %s', color => {
    const state = position([[6, 6, color], [8, 8, color], [6, 8, color], [8, 6, color]], color);
    expect(isForbiddenMove(state.board, point(7, 7), color)).toBe(true);
    expect(applyMove(state, point(7, 7))).toBeNull();
  });

  it.each(['black', 'white'] as const)('includes broken open threes for %s', color => {
    const state = position([[7, 5, color], [7, 8, color], [5, 7, color], [8, 7, color]], color);
    expect(isForbiddenMove(state.board, point(7, 7), color)).toBe(true);
    expect(applyMove(state, point(7, 7))).toBeNull();
  });

  it('does not count the two extensions of one open three twice', () => {
    const state = position([[7, 6, 'black'], [7, 8, 'black']]);
    expect(isForbiddenMove(state.board, point(7, 7), 'black')).toBe(false);
    expect(legalMoves(state.board)).toContain(point(7, 7));
    expect(applyMove(state, point(7, 7))!.result).toBeNull();
  });

  it.each(['black', 'white'] as const)('ignores blocked threes and threes unable to become an open four for %s', color => {
    const blocker = color === 'black' ? 'white' : 'black';
    const base: Array<readonly [number, number, Color]> = [[7, 6, color], [7, 8, color], [6, 7, color], [8, 7, color]];
    for (const blocks of [[[7, 5, blocker]], [[7, 4, blocker], [7, 10, blocker]]] as const) {
      const state = position([...base, ...blocks], color);
      expect(isForbiddenMove(state.board, point(7, 7), color)).toBe(false);
      expect(applyMove(state, point(7, 7))!.result).toBeNull();
    }
  });

  it('does not count an edge-blocked three or wrap it into the next row', () => {
    const state = position([[7, 0, 'black'], [7, 2, 'black'], [6, 1, 'black'], [8, 1, 'black']]);
    expect(isForbiddenMove(state.board, point(7, 1), 'black')).toBe(false);
    expect(applyMove(state, point(7, 1))!.result).toBeNull();
  });

  it('allows a four and a three', () => {
    const fourAndThree = position([[7, 5, 'black'], [7, 6, 'black'], [7, 8, 'black'], [6, 7, 'black'], [8, 7, 'black']]);
    expect(isForbiddenMove(fourAndThree.board, point(7, 7), 'black')).toBe(false);
    expect(applyMove(fourAndThree, point(7, 7))!.result).toBeNull();
  });

  it.each(['black', 'white'] as const)('forbids crossing fours and broken fours for %s without mutation', color => {
    for (const positions of [[5, 6, 8], [4, 6, 8]]) {
      const state = position([
        ...positions.map(col => [7, col, color] as const),
        ...positions.map(row => [row, 7, color] as const),
      ], color);
      const before = JSON.stringify(state);
      expect(getForbiddenMoveReason(Object.freeze([...state.board]), point(7, 7), color)).toBe('doubleFour');
      expect(legalMoves(state.board, color)).not.toContain(point(7, 7));
      expect(applyMove(state, point(7, 7))).toBeNull();
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it.each(['black', 'white'] as const)('forbids independent fours in the same direction for %s', color => {
    const state = position([3, 4, 6, 9, 10].map(col => [7, col, color] as const), color);
    expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBe('doubleFour');
    expect(applyMove(state, point(7, 7))).toBeNull();
  });

  it.each(['black', 'white'] as const)('counts the two endpoints of one open four only once for %s', color => {
    const state = position([5, 6, 8].map(col => [7, col, color] as const), color);
    expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBeNull();
    expect(applyMove(state, point(7, 7))!.result).toBeNull();
  });

  it.each(['black', 'white'] as const)('does not count a four whose completion would create a crossing overline for %s', color => {
    const blocker = color === 'black' ? 'white' : 'black';
    const state = position([
      [7, 5, color], [7, 6, color], [7, 8, color], [7, 4, blocker],
      [5, 7, color], [6, 7, color], [8, 7, color],
      ...[4, 5, 6, 8, 9].map(row => [row, 9, color] as const),
    ], color);
    expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBeNull();
    const next = applyMove(state, point(7, 7))!;
    expect(next.result).toBeNull();
    expect(getForbiddenMoveReason(next.board, point(7, 9), color)).toBe('overline');
  });

  it('does not count an unrelated three that existed before the move', () => {
    const state = position([[7, 6, 'black'], [7, 8, 'black'], [2, 2, 'black'], [2, 3, 'black'], [2, 4, 'black']]);
    expect(isForbiddenMove(state.board, point(7, 7), 'black')).toBe(false);
  });

  it.each(['black', 'white'] as const)('ignores a fake three whose only open-four extension is itself forbidden for %s', color => {
    const blocker = color === 'black' ? 'white' : 'black';
    const state = position([
      [7, 6, color], [7, 8, color], [6, 7, color], [8, 7, color], [7, 4, blocker],
      [6, 9, color], [8, 9, color], [6, 10, color], [8, 8, color],
    ], color);
    const before = JSON.stringify(state.board);
    expect(isForbiddenMove(state.board, point(7, 7), color)).toBe(false);
    expect(legalMoves(state.board, color)).toContain(point(7, 7));
    const next = applyMove(state, point(7, 7))!;
    expect(next.result).toBeNull();
    expect(isForbiddenMove(next.board, point(7, 9), color)).toBe(true);
    expect(JSON.stringify(state.board)).toBe(before);
  });

  it.each(['black', 'white'] as const)('ignores a three whose only open-four extension would create an overline for %s', color => {
    const blocker = color === 'black' ? 'white' : 'black';
    const state = position([
      [7, 6, color], [7, 8, color], [6, 7, color], [8, 7, color], [7, 4, blocker],
      ...[4, 5, 6, 8, 9].map(row => [row, 9, color] as const),
    ], color);
    expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBeNull();
    const next = applyMove(state, point(7, 7))!;
    expect(getForbiddenMoveReason(next.board, point(7, 9), color)).toBe('overline');
  });

  it.each(['black', 'white'] as const)('ignores a three whose only open-four extension would create a double four for %s', color => {
    const blocker = color === 'black' ? 'white' : 'black';
    const state = position([
      [7, 6, color], [7, 8, color], [6, 7, color], [8, 7, color], [7, 4, blocker],
      ...[5, 6, 8].map(row => [row, 9, color] as const),
    ], color);
    expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBeNull();
    const next = applyMove(state, point(7, 7))!;
    expect(getForbiddenMoveReason(next.board, point(7, 9), color)).toBe('doubleFour');
  });

  it.each(['black', 'white'] as const)('ignores a three whose only open-four extension instead wins on another line for %s', color => {
    const blocker = color === 'black' ? 'white' : 'black';
    const state = position([
      [7, 6, color], [7, 8, color], [6, 7, color], [8, 7, color], [7, 4, blocker],
      ...[5, 6, 8, 9].map(row => [row, 9, color] as const),
    ], color);
    expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBeNull();
    const next = applyMove(state, point(7, 7))!;
    expect(applyMove({ ...next, turn: color }, point(7, 9))!.result).toEqual({ winner: color, reason: 'fiveInRow' });
  });

  it.each(['black', 'white'] as const)('requires both endpoints of an extended open four to complete legal fives for %s', color => {
    const blocker = color === 'black' ? 'white' : 'black';
    for (const endCol of [5, 10]) {
      const state = position([
        [7, 6, color], [7, 8, color], [6, 7, color], [8, 7, color], [7, 4, blocker],
        ...[4, 5, 6, 8, 9].map(row => [row, endCol, color] as const),
      ], color);
      expect(getForbiddenMoveReason(state.board, point(7, 7), color)).toBeNull();
      expect(applyMove(state, point(7, 7))!.result).toBeNull();
    }
  });

  it.each(['black', 'white'] as const)('gives an exact five precedence over a double three or double four for %s', color => {
    const state = position([
      ...[3, 4, 5, 6].map(col => [7, col, color] as const),
      [6, 7, color], [8, 7, color], [6, 6, color], [8, 8, color],
    ], color);
    expect(isForbiddenMove(state.board, point(7, 7), color)).toBe(false);
    expect(applyMove(state, point(7, 7))!.result).toEqual({ winner: color, reason: 'fiveInRow' });
    state.board[point(5, 7)] = color;
    state.board[point(5, 5)] = color;
    expect(isForbiddenMove(state.board, point(7, 7), color)).toBe(false);
    expect(applyMove(state, point(7, 7))!.winningLine).toHaveLength(5);
  });

  it('rejects occupied, out-of-range and noninteger moves', () => {
    const state = position([[7, 7, 'black']]);
    for (const index of [-1, 225, 1.5, NaN, Infinity, point(7, 7)]) {
      expect(applyMove(state, index)).toBeNull();
      expect(isForbiddenMove(state.board, index, state.turn)).toBe(false);
      expect(getForbiddenMoveReason(state.board, index, state.turn)).toBeNull();
    }
    expect(applyMove({ ...state, board: [] }, 0)).toBeNull();
    expect(legalMoves([])).toEqual([]);
    expect(isForbiddenMove([], 0, 'black')).toBe(false);
    expect(getForbiddenMoveReason([], 0, 'black')).toBeNull();
  });

  it('draws when the final intersection is filled without five in a row', () => {
    const state = initialState('draw');
    state.board = Array.from({ length: 225 }, (_, index): Cell => (
      Math.floor(index / 15) + Math.floor(index % 15 / 2)
    ) % 2 === 0 ? 'black' : 'white');
    state.turn = state.board[224]!;
    state.board[224] = null;
    const next = applyMove(state, 224)!;
    expect(next.result).toEqual({ winner: null, reason: 'boardFull' });
    expect(next.winningLine).toEqual([]);
    expect(legalMoves(next.board)).toEqual([]);
  });

  it('gives a winning final move precedence over a full-board draw', () => {
    const state = initialState('last-win');
    state.board = Array<Cell>(225).fill('white');
    state.board[point(7, 7)] = null;
    for (const col of [3, 4, 5, 6]) state.board[point(7, col)] = 'black';
    expect(applyMove(state, point(7, 7))!.result).toEqual({ winner: 'black', reason: 'fiveInRow' });
  });
});

describe('Gomoku AI', () => {
  it.each([1, 2, 3, 4, 5] as const)('level %s avoids double fours and overlines for both colors', difficulty => {
    for (const color of ['black', 'white'] as const) {
      const doubleFour = position([[7, 5, color], [7, 6, color], [7, 8, color], [5, 7, color], [6, 7, color], [8, 7, color]], color);
      const overline = position([3, 4, 6, 7, 8].map(col => [7, col, color] as const), color);
      for (const state of [doubleFour, overline]) {
        const before = JSON.stringify(state);
        const move = chooseDifficultyMove(state, difficulty);
        expect(move).not.toBeNull();
        expect(legalMoves(state.board, color)).toContain(move);
        expect(applyMove(state, move!)).not.toBeNull();
        expect(JSON.stringify(state)).toBe(before);
      }
    }
  });

  it.each([1, 2, 3, 4, 5] as const)('level %s chooses an exact-five win instead of an overline', difficulty => {
    for (const color of ['black', 'white'] as const) {
      const state = position([
        ...[3, 4, 6, 7, 8].map(col => [7, col, color] as const),
        ...[3, 4, 5, 6].map(col => [2, col, color] as const),
      ], color);
      const move = chooseDifficultyMove(state, difficulty);
      expect([point(2, 2), point(2, 7)]).toContain(move);
      const next = applyMove(state, move!)!;
      expect(next.result).toEqual({ winner: color, reason: 'fiveInRow' });
      expect(next.winningLine).toHaveLength(5);
    }
  });

  it.each([1, 2, 3, 4, 5] as const)('level %s avoids double threes for both colors', difficulty => {
    for (const color of ['black', 'white'] as const) {
      const state = position([[7, 6, color], [7, 8, color], [6, 7, color], [8, 7, color]], color);
      const before = JSON.stringify(state);
      const move = chooseDifficultyMove(state, difficulty);
      expect(move).not.toBeNull();
      expect(move).not.toBe(point(7, 7));
      expect(legalMoves(state.board, color)).toContain(move);
      expect(applyMove(state, move!)).not.toBeNull();
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it.each([1, 2, 3, 4, 5] as const)('level %s starts at the center and returns legal moves without mutation', difficulty => {
    const initial = initialState('ai');
    expect(chooseDifficultyMove(initial, difficulty)).toBe(point(7, 7));
    const state = applyMove(initial, point(7, 7))!;
    const before = JSON.stringify(state);
    expect(legalMoves(state.board)).toContain(chooseDifficultyMove(state, difficulty));
    expect(JSON.stringify(state)).toBe(before);
    expect(chooseDifficultyMove({ ...state, result: { winner: 'black', reason: 'resign' } }, difficulty)).toBeNull();
    expect(chooseDifficultyMove({ ...state, board: Array<Cell>(225).fill('black') }, difficulty)).toBeNull();
  });

  it.each([1, 2, 3, 4, 5] as const)('level %s wins immediately and blocks an opponent’s immediate win', difficulty => {
    const winning = position([[7, 4, 'white'], ...[5, 6, 7, 8].map(col => [7, col, 'black'] as const)]);
    expect(chooseDifficultyMove(winning, difficulty)).toBe(point(7, 9));
    const defending = position([[7, 4, 'black'], ...[5, 6, 7, 8].map(col => [7, col, 'white'] as const)]);
    expect(chooseDifficultyMove(defending, difficulty)).toBe(point(7, 9));
  });

  it('fills an internal winning gap and favors its own win over defending', () => {
    const state = position([
      ...[4, 5, 7, 8].map(col => [7, col, 'black'] as const),
      ...[4, 5, 6, 7].map(col => [2, col, 'white'] as const),
    ]);
    expect(chooseDifficultyMove(state, 5)).toBe(point(7, 6));
  });

  it('varies beginner moves while the strongest level creates a winning open four', () => {
    const state = position([[7, 6, 'black'], [7, 7, 'black'], [7, 8, 'black'], [3, 3, 'white']]);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      expect([point(7, 5), point(7, 9)]).not.toContain(chooseDifficultyMove(state, 1));
      expect([point(7, 5), point(7, 9)]).toContain(chooseDifficultyMove(state, 5));
    } finally { random.mockRestore(); }
  });

  it('keeps a bounded thinking time in a position with many candidates', () => {
    const state = position([
      [4, 4, 'black'], [5, 5, 'white'], [7, 7, 'black'], [8, 8, 'white'],
      [10, 4, 'black'], [4, 10, 'white'], [10, 10, 'black'], [7, 10, 'white'],
    ]);
    const started = performance.now();
    expect(legalMoves(state.board)).toContain(chooseDifficultyMove(state, 5));
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
