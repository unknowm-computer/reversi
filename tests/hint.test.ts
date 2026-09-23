// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { applyMove, initialState, legalMoves } from '../shared/game/rules';
import type { GameState } from '../shared/game/types';
import { useGameHint } from '../src/composables/useGameHint';

interface HintAnswer { gameId: string; revision: number; index: number | null }
class FakeWorker {
  static instances: FakeWorker[] = [];
  static failCreate = false;
  static failPost = false;
  onmessage: ((event: MessageEvent<HintAnswer>) => void) | null = null;
  onerror: (() => void) | null = null;
  request: GameState | null = null;
  terminated = false;
  constructor() {
    if (FakeWorker.failCreate) throw new Error('Worker unavailable');
    FakeWorker.instances.push(this);
  }
  postMessage(state: GameState): void {
    if (FakeWorker.failPost) throw new Error('Worker message unavailable');
    this.request = state;
  }
  terminate(): void { this.terminated = true; }
  reply(index: number | null, metadata?: Partial<HintAnswer>): void {
    this.onmessage?.({ data: { gameId: this.request!.gameId, revision: this.request!.revision, index, ...metadata } } as MessageEvent<HintAnswer>);
  }
}

let wrapper: VueWrapper | undefined;
const state = ref(initialState('hint'));
const allowed = ref(true);
let hint: ReturnType<typeof useGameHint>;

beforeEach(() => {
  FakeWorker.instances = []; FakeWorker.failCreate = false; FakeWorker.failPost = false;
  vi.stubGlobal('Worker', FakeWorker);
  state.value = initialState('hint'); allowed.value = true;
  wrapper = mount(defineComponent({ setup() { hint = useGameHint(() => state.value, allowed); return () => null; } }));
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.unstubAllGlobals(); });

describe('solo hints', () => {
  it('recommends a legal move from the current turn without making a move or mutating the position', () => {
    state.value.turn = 'white';
    const before = JSON.stringify(state.value);
    hint.request();
    const worker = FakeWorker.instances[0];
    expect(worker.request?.turn).toBe('white');
    expect(worker.request?.board).not.toBe(state.value.board);
    expect(hint.busy.value).toBe(true);
    const move = legalMoves(state.value.board, 'white')[0];
    worker.reply(move);
    expect(hint.index.value).toBe(move); expect(hint.busy.value).toBe(false);
    expect(worker.terminated).toBe(true); expect(hint.error.value).toBeNull();
    expect(JSON.stringify(state.value)).toBe(before);
  });

  it('deduplicates pending requests, caches the same position and has no use limit', () => {
    for (let turn = 0; turn < 10; turn++) {
      hint.request(); hint.request();
      expect(FakeWorker.instances).toHaveLength(turn + 1);
      const move = legalMoves(state.value.board, state.value.turn)[0];
      FakeWorker.instances[turn].reply(move);
      hint.request(); expect(FakeWorker.instances).toHaveLength(turn + 1);
      expect(hint.index.value).toBe(move);
      state.value = applyMove(state.value, move)!;
      expect(hint.index.value).toBeNull();
    }
  });

  it('does not create work when unavailable, finished or without legal moves', () => {
    allowed.value = false; hint.request();
    allowed.value = true; state.value.result = { winner: 'white', reason: 'resign' }; hint.request();
    state.value = initialState('full'); state.value.board.fill('black'); hint.request();
    expect(FakeWorker.instances).toHaveLength(0); expect(hint.busy.value).toBe(false);
  });

  it('immediately cancels when unavailable and ignores stale replies and errors after retrying', () => {
    hint.request(); const stale = FakeWorker.instances[0];
    allowed.value = false;
    expect(stale.terminated).toBe(true); expect(hint.busy.value).toBe(false);
    allowed.value = true; hint.request();
    stale.reply(19); stale.onerror?.();
    expect(hint.index.value).toBeNull(); expect(hint.error.value).toBeNull(); expect(hint.busy.value).toBe(true);
    FakeWorker.instances[1].reply(26); expect(hint.index.value).toBe(26);
    allowed.value = false; expect(hint.index.value).toBeNull();
  });

  it.each(['game', 'revision', 'turn', 'board', 'result'] as const)('invalidates pending and displayed hints after a %s change', field => {
    function change(): void {
      if (field === 'game') state.value.gameId += '-new';
      if (field === 'revision') state.value.revision++;
      if (field === 'turn') state.value.turn = state.value.turn === 'black' ? 'white' : 'black';
      if (field === 'board') state.value.board[0] = state.value.board[0] === null ? 'black' : null;
      if (field === 'result') state.value.result = { winner: 'white', reason: 'resign' };
    }
    hint.request(); const stale = FakeWorker.instances[0]; change();
    expect(stale.terminated).toBe(true); expect(hint.busy.value).toBe(false);
    stale.reply(19); stale.onerror?.();
    expect(hint.index.value).toBeNull(); expect(hint.error.value).toBeNull();
    state.value = initialState('next'); hint.request(); FakeWorker.instances[1].reply(19);
    expect(hint.index.value).toBe(19); change(); expect(hint.index.value).toBeNull();
  });

  it('ignores mismatched response metadata', () => {
    hint.request(); const worker = FakeWorker.instances[0];
    worker.reply(19, { gameId: 'old' }); worker.reply(19, { revision: -1 });
    expect(hint.index.value).toBeNull(); expect(hint.busy.value).toBe(true);
    worker.reply(19); expect(hint.index.value).toBe(19);
  });

  it.each([0, 27, 64, null])('rejects invalid recommendation %s and allows retrying', move => {
    hint.request(); FakeWorker.instances[0].reply(move);
    expect(hint.index.value).toBeNull(); expect(hint.error.value).toContain('다시'); expect(hint.busy.value).toBe(false);
    hint.request(); expect(hint.error.value).toBeNull(); FakeWorker.instances[1].reply(19);
    expect(hint.index.value).toBe(19);
  });

  it('recovers from worker errors, construction errors and message errors', () => {
    FakeWorker.failCreate = true; hint.request();
    expect(hint.busy.value).toBe(false); expect(hint.error.value).toContain('다시');
    FakeWorker.failCreate = false; FakeWorker.failPost = true; hint.request();
    expect(FakeWorker.instances[0].terminated).toBe(true); expect(hint.busy.value).toBe(false);
    FakeWorker.failPost = false; hint.request(); FakeWorker.instances[1].onerror?.();
    expect(FakeWorker.instances[1].terminated).toBe(true); expect(hint.error.value).toContain('다시');
    hint.request(); FakeWorker.instances[2].reply(19);
    expect(hint.index.value).toBe(19); expect(hint.error.value).toBeNull();
  });

  it('terminates pending work on unmount and ignores later events', () => {
    hint.request(); const stale = FakeWorker.instances[0];
    wrapper!.unmount(); wrapper = undefined;
    expect(stale.terminated).toBe(true); expect(hint.busy.value).toBe(false);
    stale.reply(19); stale.onerror?.();
    expect(hint.index.value).toBeNull(); expect(hint.error.value).toBeNull();
  });
});
