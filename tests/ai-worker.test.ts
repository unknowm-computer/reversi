// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { initialState as initialReversiState } from '../shared/games/reversi/rules';
import { initialState as initialGomokuState } from '../shared/games/gomoku/rules';
import { useGameAiWorker } from '../src/composables/useGameAiWorker';
import type { GameAiAnswer, GameAiRequest } from '../src/workers/gameAi.types';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<GameAiAnswer>) => void) | null = null;
  onerror: (() => void) | null = null;
  request: GameAiRequest | null = null;
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(state: GameAiRequest): void { this.request = state; }
  terminate(): void { this.terminated = true; }
  reply(index: number, metadata: Partial<GameAiAnswer> = {}): void {
    const { gameType, gameId, revision } = this.request!;
    this.onmessage?.({ data: { gameType, gameId, revision, index, ...metadata } } as MessageEvent<GameAiAnswer>);
  }
}

let wrapper: VueWrapper | undefined;
const state = ref(initialReversiState('worker'));
const answer = vi.fn<(index: number | null) => void>();
const error = vi.fn<() => void>();
let ai: ReturnType<typeof useGameAiWorker>;

beforeEach(() => {
  FakeWorker.instances = []; answer.mockClear(); error.mockClear();
  vi.stubGlobal('Worker', FakeWorker);
  state.value = initialReversiState('worker');
  wrapper = mount(defineComponent({ setup() { ai = useGameAiWorker(() => state.value, answer, error); return () => null; } }));
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.unstubAllGlobals(); });

describe('shared game AI worker', () => {
  it.each([1, 2, 3, 4, 5] as const)('sends the gomoku game type and difficulty %s in a detached snapshot', difficulty => {
    state.value = initialGomokuState('gomoku'); ai.request(difficulty);
    const task = FakeWorker.instances[0];
    expect(task.request).toMatchObject({ gameType: 'gomoku', difficulty });
    expect(task.request?.board).toHaveLength(225);
    expect(task.request?.board).not.toBe(state.value.board);
    expect(task.request?.winningLine).not.toBe(state.value.winningLine);
    task.reply(112);
    expect(answer).toHaveBeenCalledExactlyOnceWith(112);
    expect(task.terminated).toBe(true); expect(ai.busy.value).toBe(false);
  });

  it.each(['gameType', 'newGame', 'undo'] as const)('ignores stale answers and errors after %s even before the caller cancels', change => {
    ai.request(3); const stale = FakeWorker.instances[0];
    if (change === 'gameType') state.value = initialGomokuState(state.value.gameId);
    if (change === 'newGame') state.value = initialReversiState('new-game');
    if (change === 'undo') state.value.revision++;
    stale.reply(19); stale.onerror?.();
    expect(answer).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
    ai.request(4);
    expect(stale.terminated).toBe(true);
    stale.reply(19); stale.onerror?.();
    expect(ai.busy.value).toBe(true);
    FakeWorker.instances[1].reply(change === 'gameType' ? 112 : 26);
    expect(answer).toHaveBeenCalledExactlyOnceWith(change === 'gameType' ? 112 : 26);
    expect(error).not.toHaveBeenCalled();
  });

  it('rejects a response carrying the wrong game type', () => {
    state.value = initialGomokuState('worker'); ai.request();
    const task = FakeWorker.instances[0];
    task.reply(19, { gameType: 'reversi' });
    expect(answer).not.toHaveBeenCalled(); expect(ai.busy.value).toBe(true);
    task.reply(112);
    expect(answer).toHaveBeenCalledExactlyOnceWith(112);
  });
});
