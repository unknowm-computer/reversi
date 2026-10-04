import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { Square } from 'chess.js';
import { useGameStore } from '../src/stores/game';
import { applyMove, initialState, isPlacement, legalMoves, validMoveCode } from '../shared/game/engine';
import { encodePieceMove, JANGGI_PASS, MAX_MOVE_CODE } from '../shared/game/pieces';
import { snapshotGameState } from '../shared/game/state';
import { DEFAULT_SETTINGS, type GameState, type Piece } from '../shared/game/types';
import { squareIndex } from '../shared/games/chess/rules';
import { positionKey as janggiPositionKey } from '../shared/games/janggi/rules';
import { commandSchema } from '../shared/protocol';

const chessMove = (from: Square, to: Square): number => encodePieceMove(squareIndex(from), squareIndex(to));
beforeEach(() => setActivePinia(createPinia()));

describe('Piece game protocol and shared engine', () => {
  it('accepts encoded moves and rejects game-specific malformed ranges', () => {
    const chess = chessMove('e2', 'e4');
    const janggi = encodePieceMove(89, 80);
    for (const code of [chess, janggi, JANGGI_PASS, MAX_MOVE_CODE]) {
      expect(commandSchema.safeParse({ type: 'move', requestId: randomUUID(), gameId: randomUUID(), expectedRevision: 0, index: code }).success).toBe(true);
    }
    expect(validMoveCode('chess', chess)).toBe(true);
    expect(validMoveCode('janggi', janggi)).toBe(true);
    expect(validMoveCode('chess', janggi)).toBe(false);
    expect(validMoveCode('janggi', JANGGI_PASS)).toBe(true);
    for (const game of ['chess', 'reversi', 'gomoku'] as const) expect(validMoveCode(game, JANGGI_PASS)).toBe(false);
    for (const game of ['reversi', 'gomoku'] as const) expect(validMoveCode(game, chess)).toBe(false);
    for (const game of ['chess', 'janggi'] as const) {
      for (const code of [0, 63, -1, Infinity, 1000.5, MAX_MOVE_CODE + 1, encodePieceMove(20, 20)]) expect(validMoveCode(game, code)).toBe(false);
    }
    expect(validMoveCode('janggi', encodePieceMove(54, 45, 'knight'))).toBe(false);
    expect(validMoveCode('chess', encodePieceMove(8, 0, 'knight'))).toBe(true);
    expect(applyMove(initialState('reversi'), chess)).toBeNull();
    expect(applyMove(initialState('gomoku', 'gomoku'), chess)).toBeNull();
  });

  it.each(['chess', 'janggi'] as const)('detaches every nested %s snapshot value', gameType => {
    const state = initialState('snapshot', gameType);
    const before = JSON.stringify(state);
    const copied = snapshotGameState(state);
    const occupied = copied.pieces!.findIndex(Boolean);
    copied.pieces![occupied]!.kind = 'queen';
    copied.pieces![occupied]!.color = 'black';
    copied.board[occupied] = null;
    copied.chess?.positionHistory.push('changed');
    copied.janggi?.positionHistory.push('changed');
    if (copied.janggi) copied.janggi.bikjang = 'white';
    expect(JSON.stringify(state)).toBe(before);
    expect(structuredClone(snapshotGameState(state))).toEqual(state);
  });

  it.each(['chess', 'janggi'] as const)('recognizes %s moves while ignoring clock-only revisions', gameType => {
    const state = initialState('placement', gameType);
    const next = applyMove(state, legalMoves(state).find(code => code !== JANGGI_PASS)!)!;
    expect(isPlacement(state, next)).toBe(true);
    expect(isPlacement(state, { ...state, revision: state.revision + 1 })).toBe(false);
    expect(isPlacement(next, { ...next, revision: next.revision + 1 })).toBe(false);
    if (gameType === 'janggi') expect(isPlacement(state, applyMove(state, JANGGI_PASS)!)).toBe(true);
  });
});

describe('Piece game history and undo', () => {
  it('restores both king and rook and the castling rights after undoing castling', () => {
    const store = useGameStore();
    store.start({ ...DEFAULT_SETTINGS, gameType: 'chess', mode: 'local', undoLimit: -1 });
    for (const [from, to] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6']] as const) {
      expect(store.move(chessMove(from, to), 24000)).toBe(true);
    }
    const before = snapshotGameState(store.state);
    expect(store.move(chessMove('e1', 'g1'), 19000)).toBe(true);
    expect(store.state.chess!.fen.split(' ')[2]).toBe('kq');
    expect(store.undo('black')).toEqual({ actor: 'black', remaining: 19000 });
    expect(store.state).toEqual({ ...before, revision: 8 });
    expect(legalMoves(store.state)).toContain(chessMove('e1', 'g1'));
  });

  it('restores an en-passant capture, its exact FEN and the repetition history', () => {
    const store = useGameStore();
    store.start({ ...DEFAULT_SETTINGS, gameType: 'chess', mode: 'local', undoLimit: -1 });
    for (const [from, to] of [['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5']] as const) expect(store.move(chessMove(from, to), 23000)).toBe(true);
    const before = snapshotGameState(store.state);
    expect(before.chess!.fen.split(' ')[3]).toBe('d6');
    expect(store.move(chessMove('e5', 'd6'), 18000)).toBe(true);
    expect(store.state.board[squareIndex('d5')]).toBeNull();
    expect(store.undo()).toEqual({ actor: 'black', remaining: 18000 });
    expect(store.state).toEqual({ ...before, revision: 6 });
    expect(legalMoves(store.state)).toContain(chessMove('e5', 'd6'));
    store.state.chess!.positionHistory.push('changed');
    expect(store.history[0].state.chess!.positionHistory).toHaveLength(1);
  });

  it('undoes a human and AI chess move together without losing initial special-move rights', () => {
    const store = useGameStore();
    store.start({ ...DEFAULT_SETTINGS, gameType: 'chess', mode: 'ai' });
    const initial = snapshotGameState(store.state);
    expect(store.move(chessMove('e2', 'e4'), 17000)).toBe(true);
    expect(store.move(chessMove('e7', 'e5'), 25000)).toBe(true);
    expect(store.undo()).toEqual({ actor: 'black', remaining: 17000 });
    expect(store.state).toEqual({ ...initial, revision: 3 });
    expect(store.history).toEqual([]);
  });

  it('restores Janggi pass metadata and both chosen formations', () => {
    const store = useGameStore();
    store.start({ ...DEFAULT_SETTINGS, gameType: 'janggi', mode: 'local', undoLimit: -1, janggiBlackFormation: 'left', janggiWhiteFormation: 'right' });
    const initial = snapshotGameState(store.state);
    expect(store.move(JANGGI_PASS, 20000)).toBe(true);
    const passed = snapshotGameState(store.state);
    expect(passed.janggi!.consecutivePasses).toBe(1);
    expect(store.move(JANGGI_PASS, 18000)).toBe(true);
    expect(store.state.result?.reason).toBe('mutualPass');
    expect(store.undo()).toEqual({ actor: 'white', remaining: 18000 });
    expect(store.state).toEqual({ ...passed, revision: 3 });
    expect(store.undo()).toEqual({ actor: 'black', remaining: 20000 });
    expect(store.state).toEqual({ ...initial, revision: 4 });
    expect(store.settings.janggiBlackFormation).toBe('left');
    expect(store.settings.janggiWhiteFormation).toBe('right');
  });

  it('undoes a bikjang acceptance back to the pending offer and then restores the blocking piece', () => {
    const store = useGameStore();
    store.start({ ...DEFAULT_SETTINGS, gameType: 'janggi', mode: 'local', undoLimit: -1 });
    const pieces = Array<Piece | null>(90).fill(null);
    pieces[76] = { kind: 'general', color: 'black' };
    pieces[13] = { kind: 'general', color: 'white' };
    pieces[49] = { kind: 'soldier', color: 'black' };
    const start: GameState = {
      ...store.state, pieces, board: pieces.map(piece => piece?.color ?? null),
      janggi: { consecutivePasses: 0, bikjang: null, positionHistory: [janggiPositionKey(pieces, 'black', null)] },
    };
    store.state = start;
    expect(store.move(encodePieceMove(49, 48), 21000)).toBe(true);
    const offered = snapshotGameState(store.state);
    expect(offered.janggi?.bikjang).toBe('black');
    expect(store.move(JANGGI_PASS, 17000)).toBe(true);
    expect(store.state.result?.reason).toBe('bikjang');
    expect(store.undo()).toEqual({ actor: 'white', remaining: 17000 });
    expect(store.state).toEqual({ ...offered, revision: 3 });
    expect(store.undo()).toEqual({ actor: 'black', remaining: 21000 });
    expect(store.state).toEqual({ ...start, revision: 4 });
  });

  it.each(['chess', 'janggi'] as const)('detaches received %s online state from the caller', gameType => {
    const store = useGameStore();
    const state = initialState('online', gameType);
    const before = snapshotGameState(state);
    store.online(state, { ...DEFAULT_SETTINGS, gameType, mode: 'online' });
    state.pieces!.find(piece => piece !== null)!.color = 'black';
    state.chess?.positionHistory.push('mutated');
    state.janggi?.positionHistory.push('mutated');
    expect(store.state).toEqual(before);
    expect(store.canUndo).toBe(false);
  });
});
