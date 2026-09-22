// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { initialState, applyMove } from '../shared/game/rules';
import type { GameState } from '../shared/game/types';
import { impactKind, useMoveImpact, IMPACT_MS } from '../src/composables/useMoveImpact';
let wrapper: VueWrapper | undefined;
beforeEach(() => { vi.useFakeTimers(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.useRealTimers(); });
function capture(index: number, count: number, actor: 'black' | 'white' = 'black'): [GameState, GameState] {
  const before = initialState('test'); before.turn = actor;
  const next = { ...before, board: [...before.board], revision: 1, lastMove: index, flipped: Array.from({ length: count }, (_, i) => i + 8) };
  next.board[index] = actor; for (const cell of next.flipped) { before.board[cell] = actor === 'black' ? 'white' : 'black'; next.board[cell] = actor; }
  return [before, next];
}
describe('special move impact', () => {
  it('only triggers for five or more flips including corners, for either player', () => {
    for (const actor of ['black', 'white'] as const) {
      for (const corner of [0, 7, 56, 63]) expect(impactKind(...capture(corner, 1, actor))).toBeNull();
      expect(impactKind(...capture(19, 4, actor))).toBeNull();
      expect(impactKind(...capture(19, 5, actor))).toBe('capture');
      for (const corner of [0, 7, 56, 63]) {
        expect(impactKind(...capture(corner, 4, actor))).toBeNull();
        expect(impactKind(...capture(corner, 5, actor))).toBe('capture');
      }
    }
    const before = initialState('ordinary'); expect(impactKind(before, applyMove(before, 19)!)).toBeNull();
  });
  it('does not replay after reconnect, reset, undo or a non-move update', () => {
    const [before, next] = capture(19, 5);
    expect(impactKind(before, { ...next, gameId: 'new' })).toBeNull();
    expect(impactKind(before, { ...next, revision: 8 })).toBeNull();
    expect(impactKind(before, { ...next, flipped: [] })).toBeNull();
    expect(impactKind(next, { ...next, revision: 2, result: { winner: 'black', reason: 'resign' } })).toBeNull();
  });
  it('places the new stone first, keeps old colors until impact and waits for flips', () => {
    const [before, next] = capture(19, 5); const state = ref(before); const hit = vi.fn(); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, hit); return () => null; } }));
    state.value = next;
    expect(impact.displayed.value.board[19]).toBe('black'); expect(impact.displayed.value.board[8]).toBe('white');
    expect(impact.scene.value?.actor).toBe('black'); expect(impact.busy.value).toBe(true);
    vi.advanceTimersByTime(IMPACT_MS - 1); expect(hit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(hit).toHaveBeenCalledOnce(); expect(impact.scene.value).toBeNull(); expect(impact.displayed.value.board[8]).toBe('black'); expect(impact.busy.value).toBe(true);
    vi.advanceTimersByTime(530); expect(impact.busy.value).toBe(false);
  });
  it('cancels pending effects on undo and unmount', () => {
    const [before, next] = capture(19, 5); const state = ref(before); const hit = vi.fn(); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, hit); return () => null; } }));
    state.value = next; state.value = { ...before, revision: 2 }; vi.advanceTimersByTime(2000);
    expect(impact.busy.value).toBe(false); expect(hit).not.toHaveBeenCalled();
    state.value = { ...next, revision: 3 }; wrapper.unmount(); wrapper = undefined; vi.advanceTimersByTime(2000); expect(hit).not.toHaveBeenCalled();
  });
});
