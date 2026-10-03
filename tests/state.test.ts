import { describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import { snapshotGameState } from '../shared/game/state';
import { initialState } from '../shared/games/reversi/rules';

describe('Game state snapshots', () => {
  it('can send reactive state, including a result, across the Worker boundary', () => {
    const state = reactive(initialState('snapshot'));
    state.flipped = [27];
    state.winningLine = [1, 2, 3, 4, 5];
    state.result = { winner: 'black', reason: 'noLegalMoves' };

    const snapshot = snapshotGameState(state);
    expect(structuredClone(snapshot)).toEqual(state);

    snapshot.board[27] = 'black';
    snapshot.flipped.push(28);
    snapshot.winningLine.push(6);
    snapshot.result!.winner = 'white';
    expect(state.board[27]).toBe('white');
    expect(state.flipped).toEqual([27]);
    expect(state.winningLine).toEqual([1, 2, 3, 4, 5]);
    expect(state.result.winner).toBe('black');
  });

  it('keeps saved history unchanged when the live state is mutated', () => {
    const state = reactive(initialState('history'));
    const snapshot = snapshotGameState(state);
    state.board[19] = 'black';
    state.flipped.push(27);
    state.revision++;
    state.result = { winner: 'white', reason: 'resign' };

    expect(snapshot).toEqual(initialState('history'));
  });
});
