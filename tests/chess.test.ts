import { Chess, type Square } from 'chess.js';
import { describe, expect, it, vi } from 'vitest';
import { decodePieceMove, encodePieceMove, PROMOTIONS, type Promotion } from '../shared/game/pieces';
import type { AiDifficulty, GameState } from '../shared/game/types';
import { chooseDifficultyMove } from '../shared/games/chess/ai';
import { applyMove, initialState, legalMoves, playerColor, positionKey, squareIndex } from '../shared/games/chess/rules';

const code = (from: Square, to: Square, promotion: Promotion = 'queen'): number => encodePieceMove(squareIndex(from), squareIndex(to), promotion);
function position(fen: string): GameState {
  const chess = new Chess(fen);
  return { ...initialState('fixture'), turn: playerColor(chess.turn()), chess: { fen: chess.fen(), positionHistory: [positionKey(chess)] } };
}
function play(state: GameState, moves: ReadonlyArray<readonly [Square, Square]>): GameState {
  return moves.reduce((current, [from, to]) => {
    const next = applyMove(current, code(from, to));
    expect(next, `${from}-${to}`).not.toBeNull();
    return next!;
  }, state);
}

describe('Chess rules', () => {
  it('starts with 32 pieces and 20 moves, with white chess pieces assigned to the first player', () => {
    const state = initialState('chess');
    expect(state.gameType).toBe('chess');
    expect(state.turn).toBe('black');
    expect(state.pieces).toHaveLength(64);
    expect(state.board.filter(Boolean)).toHaveLength(32);
    expect(state.pieces?.[squareIndex('e1')]).toEqual({ kind: 'king', color: 'black' });
    expect(state.pieces?.[squareIndex('e8')]).toEqual({ kind: 'king', color: 'white' });
    expect(legalMoves(state)).toHaveLength(20);
    expect(state.chess?.positionHistory).toHaveLength(1);
  });

  it('moves pieces with an immutable color projection and alternates the player', () => {
    const state = initialState('move');
    const original = JSON.stringify(state);
    const next = applyMove(state, code('e2', 'e4'))!;
    expect(next.turn).toBe('white');
    expect(next.lastFrom).toBe(squareIndex('e2'));
    expect(next.lastMove).toBe(squareIndex('e4'));
    expect(next.revision).toBe(1);
    expect(next.board[squareIndex('e2')]).toBeNull();
    expect(next.pieces?.[squareIndex('e4')]).toEqual({ kind: 'pawn', color: 'black' });
    expect(next.chess?.positionHistory).toHaveLength(2);
    expect(next.check).toBeNull();
    expect(JSON.stringify(state)).toBe(original);
  });

  it('rejects unencoded moves, off-board moves, wrong turns and blocked movement', () => {
    const state = initialState('invalid');
    for (const move of [0, -1, NaN, Infinity, 1234.5, code('e7', 'e5'), code('a1', 'a3'), encodePieceMove(65, 66), code('e2', 'e4', 'rook')]) {
      expect(applyMove(state, move)).toBeNull();
    }
    expect(legalMoves({ ...state, turn: 'white' })).toEqual([]);
    expect(legalMoves({ ...state, chess: { fen: 'invalid', positionHistory: [] } })).toEqual([]);
  });

  it('does not allow a pinned piece to expose its king', () => {
    const state = position('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');
    expect(legalMoves(state)).not.toContain(code('e2', 'f2'));
    expect(applyMove(state, code('e2', 'f2'))).toBeNull();
    expect(legalMoves(state)).toContain(code('e2', 'e8'));
  });

  it.each([['g1', 'f1', 'h1'], ['c1', 'd1', 'a1']] as const)('castles the king to %s and rook to %s', (kingTo, rookTo, rookFrom) => {
    const state = position('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const next = applyMove(state, code('e1', kingTo))!;
    expect(next.pieces?.[squareIndex(kingTo)]).toEqual({ kind: 'king', color: 'black' });
    expect(next.pieces?.[squareIndex(rookTo)]).toEqual({ kind: 'rook', color: 'black' });
    expect(next.board[squareIndex(rookFrom)]).toBeNull();
    expect(next.chess?.fen.split(' ')[2]).toBe('kq');
  });

  it('rejects castling across an attacked square and after the rook moved back', () => {
    const attacked = position('4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(applyMove(attacked, code('e1', 'g1'))).toBeNull();
    expect(applyMove(attacked, code('e1', 'c1'))).not.toBeNull();
    const returned = play(position('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1'), [['h1', 'h2'], ['e8', 'e7'], ['h2', 'h1'], ['e7', 'e8']]);
    expect(applyMove(returned, code('e1', 'g1'))).toBeNull();
  });

  it('captures en passant only on the next move and removes the passed pawn', () => {
    const state = play(initialState('en-passant'), [['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5']]);
    const captured = applyMove(state, code('e5', 'd6'))!;
    expect(captured.pieces?.[squareIndex('d6')]).toEqual({ kind: 'pawn', color: 'black' });
    expect(captured.board[squareIndex('d5')]).toBeNull();
    expect(captured.board.filter(Boolean)).toHaveLength(31);
    const waited = play(state, [['a2', 'a3'], ['a6', 'a5']]);
    expect(applyMove(waited, code('e5', 'd6'))).toBeNull();
  });

  it('rejects en passant when removing the pawn would expose the king', () => {
    expect(applyMove(position('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'), code('e5', 'd6'))).toBeNull();
  });

  it.each(PROMOTIONS)('supports promotion to %s as a distinct legal move', promotion => {
    const state = position('7k/P7/8/8/8/8/8/4K3 w - - 0 1');
    expect(legalMoves(state).filter(move => decodePieceMove(move)?.from === squareIndex('a7'))).toHaveLength(4);
    const next = applyMove(state, code('a7', 'a8', promotion))!;
    expect(next.pieces?.[squareIndex('a8')]).toEqual({ kind: promotion, color: 'black' });
  });

  it('maps the second player’s castling and promotion to black chess pieces', () => {
    const castle = applyMove(position('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1'), code('e8', 'g8'))!;
    expect(castle.pieces?.[squareIndex('f8')]).toEqual({ kind: 'rook', color: 'white' });
    expect(castle.pieces?.[squareIndex('g8')]).toEqual({ kind: 'king', color: 'white' });
    expect(castle.turn).toBe('black');
    const promoted = applyMove(position('4k3/8/8/8/8/8/p7/7K b - - 0 1'), code('a2', 'a1', 'knight'))!;
    expect(promoted.pieces?.[squareIndex('a1')]).toEqual({ kind: 'knight', color: 'white' });
  });

  it('records check and checkmate, and blocks further moves', () => {
    const check = play(initialState('check'), [['e2', 'e4'], ['f7', 'f6'], ['d1', 'h5']]);
    expect(check.check).toBe('white');
    expect(check.result).toBeNull();
    const mate = play(initialState('mate'), [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]);
    expect(mate.result).toEqual({ winner: 'white', reason: 'checkmate' });
    expect(legalMoves(mate)).toEqual([]);
    expect(applyMove(mate, code('a2', 'a3'))).toBeNull();
  });

  it('draws on stalemate without reporting check', () => {
    const next = applyMove(position('7k/5K2/8/5Q2/8/8/8/8 w - - 0 1'), code('f5', 'g6'))!;
    expect(next.result).toEqual({ winner: null, reason: 'stalemate' });
    expect(next.check).toBeNull();
  });

  it('draws on insufficient mating material or fifty full moves without capture/pawn moves', () => {
    const kings = applyMove(position('7k/8/8/8/8/8/5b2/4K3 w - - 0 1'), code('e1', 'f2'))!;
    expect(kings.result).toEqual({ winner: null, reason: 'insufficientMaterial' });
    const fifty = applyMove(position('4k3/8/8/8/8/8/8/R3K3 w - - 99 50'), code('a1', 'a2'))!;
    expect(fifty.result).toEqual({ winner: null, reason: 'fiftyMoves' });
  });

  it('recognizes threefold repetition across serialized state snapshots', () => {
    const cycle: ReadonlyArray<readonly [Square, Square]> = [['g1', 'f3'], ['g8', 'f6'], ['f3', 'g1'], ['f6', 'g8']];
    const twice = play(initialState('repeat'), cycle);
    expect(twice.result).toBeNull();
    const restored = JSON.parse(JSON.stringify(twice)) as GameState;
    const thrice = play(restored, cycle);
    expect(thrice.result).toEqual({ winner: null, reason: 'repetition' });
    expect(twice.chess?.positionHistory).toHaveLength(5);
    expect(thrice.chess?.positionHistory).toHaveLength(9);
  });

  it('preserves en-passant and castling rights after restoring a snapshot', () => {
    const state = play(initialState('restore'), [['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5']]);
    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    expect(legalMoves(restored)).toEqual(legalMoves(state));
    expect(applyMove(restored, code('e5', 'd6'))).toEqual(applyMove(state, code('e5', 'd6')));
  });
});

describe('Chess AI', () => {
  it.each([1, 2, 3, 4, 5] as AiDifficulty[])('returns a legal move at difficulty %s without mutating the position', difficulty => {
    const state = initialState('ai');
    const before = JSON.stringify(state);
    const chosen = chooseDifficultyMove(state, difficulty);
    expect(legalMoves(state)).toContain(chosen);
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each([2, 3, 4, 5] as AiDifficulty[])('takes an immediate checkmate at difficulty %s', difficulty => {
    const state = position('7k/8/5KQ1/8/8/8/8/8 w - - 0 1');
    const chosen = chooseDifficultyMove(state, difficulty)!;
    expect(applyMove(state, chosen)?.result).toEqual({ winner: 'black', reason: 'checkmate' });
  });

  it('prefers an undefended queen over a quiet developing move', () => {
    const state = position('7k/q7/8/8/8/8/R7/K7 w - - 0 1');
    expect(chooseDifficultyMove(state, 3)).toBe(code('a2', 'a7'));
  });

  it('returns no move in a checkmated or stalemated position even before a result is attached', () => {
    const mate = position('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
    const stalemate = position('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
    expect(chooseDifficultyMove(mate, 5)).toBeNull();
    expect(chooseDifficultyMove(stalemate, 1)).toBeNull();
  });

  it('uses the full legal move list for the beginner level and stops at a result', () => {
    const state = initialState('random');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(chooseDifficultyMove(state, 1)).toBe(legalMoves(state).at(-1));
    vi.restoreAllMocks();
    state.result = { winner: 'black', reason: 'resign' };
    expect(chooseDifficultyMove(state, 1)).toBeNull();
    expect(chooseDifficultyMove(state, 5)).toBeNull();
  });
});
