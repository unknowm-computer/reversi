import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGameStore } from '../src/stores/game';
import { initialState, legalMoves } from '../shared/game/rules';
import { DEFAULT_SETTINGS, type Cell } from '../shared/game/types';
beforeEach(() => setActivePinia(createPinia()));
describe('Undo contracts', () => {
  it('undoes a human move before the AI responds', () => {
    const store = useGameStore(); store.start(DEFAULT_SETTINGS); const board = [...store.state.board];
    store.move(19, 23000); expect(store.undo()).toEqual({ remaining: 23000, actor: 'black' });
    expect(store.state.board).toEqual(board); expect(store.state.turn).toBe('black'); expect(store.canUndo).toBe(false);
  });
  it('undoes the human move and the AI response together', () => {
    const store = useGameStore(); store.start(DEFAULT_SETTINGS); const board = [...store.state.board];
    store.move(19, 24000); store.move(legalMoves(store.state.board, 'white')[0], 29000);
    store.undo(); expect(store.state.board).toEqual(board); expect(store.history).toHaveLength(0); expect(store.state.revision).toBe(3);
  });
  it('undoes multiple AI replies after a human pass', () => {
    const store = useGameStore(); store.start(DEFAULT_SETTINGS);
    const checkpoint = initialState(store.state.gameId);
    store.history.push({ state: checkpoint, actor: 'black', remaining: 18000 });
    const board: Cell[] = Array(64).fill('white'); board[0] = null; board[1] = 'black'; board[3] = null; board[4] = 'black';
    store.state = { ...checkpoint, board, turn: 'white', revision: 1 };
    store.move(0, 30000); expect(store.state.passed).toBe('black'); store.move(3, 30000);
    store.undo(); expect(store.state.board).toEqual(checkpoint.board); expect(store.history).toHaveLength(0);
  });
  it('charges the actual mover and never refunds consumed undo credits', () => {
    const store = useGameStore(); store.start({ ...DEFAULT_SETTINGS, mode: 'local', undoLimit: 1 });
    store.move(19, 27000); store.move(18, 25000);
    expect(store.undo()?.actor).toBe('white'); expect(store.undoUsed.white).toBe(1); expect(store.state.turn).toBe('white');
    expect(store.undo()?.actor).toBe('black'); expect(store.undoUsed).toEqual({ black: 1, white: 1 });
    store.move(19, 22000); expect(store.canUndo).toBe(false);
  });
  it('supports disabled and unlimited local undo', () => {
    const store = useGameStore(); store.start({ ...DEFAULT_SETTINGS, mode: 'local', undoLimit: 0 }); store.move(19, 20000); expect(store.undo()).toBeNull();
    store.start({ ...DEFAULT_SETTINGS, mode: 'local', undoLimit: -1 });
    for (let i = 0; i < 5; i++) { store.move(19, 20000); expect(store.undo()).not.toBeNull(); }
  });
  it('restores a terminal move and its automatic pass state', () => {
    const store = useGameStore(); store.start({ ...DEFAULT_SETTINGS, mode: 'local' });
    const board: Cell[] = Array(64).fill('black'); board[0] = null; board[1] = 'white';
    store.state = { ...store.state, board }; store.move(0, 2300); expect(store.state.result).not.toBeNull();
    expect(store.undo()?.remaining).toBe(2300); expect(store.state.result).toBeNull(); expect(store.state.board[0]).toBeNull();
  });
  it('forbids undo in online games and after non-normal endings', () => {
    const store = useGameStore(); store.start({ ...DEFAULT_SETTINGS, mode: 'online' }); store.move(19, 30000); expect(store.canUndo).toBe(false);
    store.start(DEFAULT_SETTINGS); store.move(19, 30000); store.finish('black', 'timeout'); expect(store.canUndo).toBe(false);
  });
});
