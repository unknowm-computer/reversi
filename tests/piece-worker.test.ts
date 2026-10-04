// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { initialState, legalMoves } from '../shared/game/engine';
import { encodePieceMove, JANGGI_PASS } from '../shared/game/pieces';
import { useGameAiWorker } from '../src/composables/useGameAiWorker';
import type { GameAiAnswer, GameAiRequest } from '../src/workers/gameAi.types';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<GameAiAnswer>) => void) | null = null;
  onerror: (() => void) | null = null;
  request: GameAiRequest | null = null;
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(request: GameAiRequest): void { this.request = request; }
  terminate(): void { this.terminated = true; }
  reply(index: number): void {
    const { gameType, gameId, revision } = this.request!;
    this.onmessage?.({ data: { gameType, gameId, revision, index } } as MessageEvent<GameAiAnswer>);
  }
}

afterEach(() => { FakeWorker.instances = []; vi.unstubAllGlobals(); });

describe('Piece game worker messages', () => {
  it.each(['chess', 'janggi'] as const)('sends serializable detached %s pieces and rule metadata', gameType => {
    vi.stubGlobal('Worker', FakeWorker);
    const state = ref(initialState('worker', gameType));
    const answer = vi.fn<(index: number | null) => void>();
    let ai!: ReturnType<typeof useGameAiWorker>;
    const wrapper = mount(defineComponent({ setup() { ai = useGameAiWorker(() => state.value, answer, vi.fn()); return () => null; } }));
    try {
      ai.request(4);
      const worker = FakeWorker.instances[0];
      expect(worker.request!.difficulty).toBe(4);
      expect(() => structuredClone(worker.request)).not.toThrow();
      expect(worker.request!.pieces).not.toBe(state.value.pieces);
      const occupied = state.value.pieces!.findIndex(Boolean);
      expect(worker.request!.pieces![occupied]).not.toBe(state.value.pieces![occupied]);
      if (gameType === 'chess') expect(worker.request!.chess!.positionHistory).not.toBe(state.value.chess!.positionHistory);
      else expect(worker.request!.janggi!.positionHistory).not.toBe(state.value.janggi!.positionHistory);
      const before = JSON.stringify(worker.request);
      state.value.pieces![occupied]!.kind = 'queen';
      state.value.chess?.positionHistory.push('changed');
      state.value.janggi?.positionHistory.push('changed');
      expect(JSON.stringify(worker.request)).toBe(before);
      const move = gameType === 'chess' ? encodePieceMove(8, 0, 'knight') : JANGGI_PASS;
      worker.reply(move);
      expect(answer).toHaveBeenCalledExactlyOnceWith(move);
      expect(worker.terminated).toBe(true);
      expect(ai.busy.value).toBe(false);
    } finally { wrapper.unmount(); }
  });

  it.each(['chess', 'janggi'] as const)('ignores stale %s analysis after undo or game switch', gameType => {
    vi.stubGlobal('Worker', FakeWorker);
    const state = ref(initialState('same-id', gameType));
    const answer = vi.fn<(index: number | null) => void>();
    const onError = vi.fn();
    let ai!: ReturnType<typeof useGameAiWorker>;
    const wrapper = mount(defineComponent({ setup() { ai = useGameAiWorker(() => state.value, answer, onError); return () => null; } }));
    try {
      ai.request();
      const old = FakeWorker.instances[0];
      state.value.revision++;
      old.reply(legalMoves(state.value)[0]);
      old.onerror?.();
      expect(answer).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      ai.request(2);
      const current = FakeWorker.instances[1];
      expect(old.terminated).toBe(true);
      state.value = initialState('same-id', gameType === 'chess' ? 'janggi' : 'chess');
      current.reply(legalMoves(state.value)[0]);
      expect(answer).not.toHaveBeenCalled();
      ai.cancel();
      expect(current.terminated).toBe(true);
      expect(ai.busy.value).toBe(false);
    } finally { wrapper.unmount(); }
  });
});
