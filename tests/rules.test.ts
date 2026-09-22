import { describe, expect, it } from 'vitest';
import { applyMove, endGame, flipsFor, initialState, legalMoves, score } from '../shared/game/rules';
import { chooseMove } from '../shared/game/ai';
import type { Cell, GameState } from '../shared/game/types';
describe('Reversi rules', () => {
  it('starts with four legal black moves and an even score', () => {
    const state = initialState('test');
    expect(legalMoves(state.board, 'black')).toEqual([19, 26, 37, 44]);
    expect(score(state.board)).toEqual({ black: 2, white: 2, empty: 60 });
  });
  it('flips all eight directions without mutating the input', () => {
    const board: Cell[] = Array(64).fill(null);
    const origin = 27;
    const around: number[] = [];
    for (const dr of [-1, 0, 1]) for (const dc of [-1, 0, 1]) {
      if (!dr && !dc) continue;
      board[(3 + dr) * 8 + 3 + dc] = 'white'; around.push((3 + dr) * 8 + 3 + dc);
      board[(3 + 2 * dr) * 8 + 3 + 2 * dc] = 'black';
    }
    expect(flipsFor(board, origin, 'black').sort((a, b) => a - b)).toEqual(around.sort((a, b) => a - b));
    const state = { ...initialState('test'), board };
    const next = applyMove(state, origin)!;
    expect(score(next.board).black).toBe(17);
    expect(board[origin]).toBeNull();
  });
  it('does not wrap at row boundaries or jump over empty cells', () => {
    const board: Cell[] = Array(64).fill(null); board[8] = 'white'; board[9] = 'black';
    expect(flipsFor(board, 7, 'black')).toEqual([]);
    board[1] = 'white'; board[3] = 'black';
    expect(flipsFor(board, 0, 'black')).toEqual([]);
  });
  it('rejects invalid coordinates, occupied and noncapturing cells', () => {
    const state = initialState('test');
    for (const move of [-1, 64, 1.5, NaN, 27, 0]) expect(applyMove(state, move)).toBeNull();
    expect(state.revision).toBe(0);
  });
  it('automatically passes when only the opponent has no move', () => {
    const board: Cell[] = Array(64).fill('black'); board[0] = null; board[1] = 'white'; board[3] = null; board[4] = 'white';
    const next = applyMove({ ...initialState('test'), board }, 0)!;
    expect(next.passed).toBe('white'); expect(next.turn).toBe('black'); expect(next.result).toBeNull();
    expect(legalMoves(next.board, 'black')).toContain(3);
  });
  it('ends with empty cells left when neither player can move', () => {
    const board: Cell[] = Array(64).fill('black'); board[0] = null; board[1] = 'white'; board[63] = null;
    const next = applyMove({ ...initialState('test'), board }, 0)!;
    expect(next.result).toEqual({ winner: 'black', reason: 'noLegalMoves' }); expect(score(next.board).empty).toBe(1);
  });
  it('recognizes a 32–32 draw and prevents moves after termination', () => {
    const board: Cell[] = Array(64).fill('white');
    for (let i = 0; i < 30; i++) board[i] = 'black';
    board[0] = null; board[1] = 'white'; board[40] = board[41] = 'black';
    const next = applyMove({ ...initialState('test'), board }, 0)!;
    expect(score(next.board)).toEqual({ black: 32, white: 32, empty: 0 });
    expect(next.result?.winner).toBeNull(); expect(applyMove(next, 10)).toBeNull();
  });
  it.each(['resign', 'timeout', 'disconnect'] as const)('preserves board but ends on %s', reason => {
    const state = initialState('test'); const next = endGame(state, 'black', reason);
    expect(next.result).toEqual({ winner: 'white', reason }); expect(next.board).toEqual(state.board); expect(next.revision).toBe(1);
  });
  it('maintains counts, turn legality and termination throughout full games', () => {
    for (let seed = 0; seed < 12; seed++) {
      let state: GameState = initialState('test'), turns = 0;
      while (!state.result) {
        const moves = legalMoves(state.board, state.turn); expect(moves.length).toBeGreaterThan(0);
        const before = score(state.board);
        state = applyMove(state, moves[(seed * 17 + turns * 13) % moves.length])!;
        expect(score(state.board).empty).toBe(before.empty - 1);
        expect(++turns).toBeLessThanOrEqual(60);
      }
      expect(legalMoves(state.board, 'black')).toHaveLength(0);
      expect(legalMoves(state.board, 'white')).toHaveLength(0);
    }
  });
});
describe('AI', () => {
  it('returns a legal move within the search budget', () => {
    const state = initialState('ai'); const start = performance.now();
    expect(legalMoves(state.board, 'black')).toContain(chooseMove(state, 50));
    expect(performance.now() - start).toBeLessThan(500);
  });
  it('takes a safe corner and returns null on a finished game', () => {
    const board: Cell[] = Array(64).fill(null); board[1] = 'white'; board[2] = 'black'; board[27] = 'white'; board[28] = 'black';
    const state = { ...initialState('ai'), board };
    expect(chooseMove(state, 50)).toBe(0);
    expect(chooseMove(endGame(state, 'black', 'resign'))).toBeNull();
  });
});
