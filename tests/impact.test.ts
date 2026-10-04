// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { initialState, applyMove } from '../shared/games/reversi/rules';
import { initialState as initialGomokuState, applyMove as applyGomokuMove } from '../shared/games/gomoku/rules';
import { initialState as initialChessState, applyMove as applyChessMove, squareIndex } from '../shared/games/chess/rules';
import { initialState as initialJanggiState, applyMove as applyJanggiMove } from '../shared/games/janggi/rules';
import { encodePieceMove } from '../shared/game/pieces';
import type { GameState, Piece } from '../shared/game/types';
import { impactKind, useMoveImpact, IMPACT_MS } from '../src/composables/useMoveImpact';
import MoveImpact from '../src/components/game/MoveImpact.vue';
let wrapper: VueWrapper | undefined;
beforeEach(() => { vi.useFakeTimers(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.useRealTimers(); });
function capture(index: number, count: number, actor: 'black' | 'white' = 'black'): [GameState, GameState] {
  const before = initialState('test'); before.turn = actor;
  const next = { ...before, board: [...before.board], revision: 1, lastMove: index, flipped: Array.from({ length: count }, (_, i) => i + 8) };
  next.board[index] = actor; for (const cell of next.flipped) { before.board[cell] = actor === 'black' ? 'white' : 'black'; next.board[cell] = actor; }
  return [before, next];
}
function checkingMove(gameType: 'chess' | 'janggi'): [GameState, GameState] {
  if (gameType === 'chess') {
    let before = initialChessState('check');
    for (const [from, to] of [['e2', 'e4'], ['f7', 'f6']] as const) before = applyChessMove(before, encodePieceMove(squareIndex(from), squareIndex(to)))!;
    return [before, applyChessMove(before, encodePieceMove(squareIndex('d1'), squareIndex('h5')))!];
  }
  const pieces = Array<Piece | null>(90).fill(null);
  pieces[75] = { color: 'black', kind: 'general' };
  pieces[14] = { color: 'white', kind: 'general' };
  pieces[45] = { color: 'black', kind: 'rook' };
  const before = { ...initialJanggiState('janggun'), pieces, board: pieces.map(piece => piece?.color ?? null) };
  return [before, applyJanggiMove(before, encodePieceMove(45, 50))!];
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
  it('never plays a capture taunt for gomoku, including a five-stone victory', () => {
    const before = initialGomokuState('gomoku');
    for (const index of [105, 106, 107, 108]) before.board[index] = 'black';
    const next = applyGomokuMove(before, 109)!;
    expect(next.result?.reason).toBe('fiveInRow');
    expect(impactKind(before, next)).toBeNull();
    expect(impactKind(before, { ...next, flipped: [105, 106, 107, 108, 109] })).toBeNull();
  });
  it('clears a pending capture when the game type changes at the same revision', () => {
    const [before, next] = capture(19, 5); const state = ref(before); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value); return () => null; } }));
    state.value = next;
    expect(impact.busy.value).toBe(true);
    state.value = { ...initialGomokuState(next.gameId), revision: next.revision };
    expect(impact.busy.value).toBe(false); expect(impact.scene.value).toBeNull();
    expect(impact.displayed.value.gameType).toBe('gomoku');
    vi.advanceTimersByTime(3000);
    expect(impact.displayed.value.board).toHaveLength(225);
  });
  it('starts the taunt once, places the new stone first and waits for the face and flips', () => {
    const [before, next] = capture(19, 5); const state = ref(before); const start = vi.fn(); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, start); return () => null; } }));
    state.value = next;
    expect(impact.displayed.value.board[19]).toBe('black'); expect(impact.displayed.value.board[8]).toBe('white');
    expect(impact.scene.value?.actor).toBe('black'); expect(impact.busy.value).toBe(true);
    expect(start).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(IMPACT_MS - 1); expect(impact.scene.value?.kind).toBe('capture');
    vi.advanceTimersByTime(1); expect(start).toHaveBeenCalledOnce(); expect(impact.scene.value).toBeNull(); expect(impact.displayed.value.board[8]).toBe('black'); expect(impact.busy.value).toBe(true);
    vi.advanceTimersByTime(530); expect(impact.busy.value).toBe(false);
  });
  it('does not replay or extend the taunt for repeated online snapshots', () => {
    const [before, next] = capture(19, 5); const state = ref(before); const start = vi.fn(); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, start); return () => null; } }));
    state.value = next; vi.advanceTimersByTime(500);
    state.value = { ...next, board: [...next.board] };
    expect(start).toHaveBeenCalledOnce(); expect(impact.scene.value?.kind).toBe('capture');
    vi.advanceTimersByTime(IMPACT_MS - 500);
    expect(start).toHaveBeenCalledOnce(); expect(impact.scene.value).toBeNull();
  });
  it('keeps hidden moves silent and reveals their final board immediately', () => {
    const [before, next] = capture(19, 5); const state = ref(before); const start = vi.fn(); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, start); return () => null; } }));
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); state.value = next;
    expect(start).not.toHaveBeenCalled(); expect(impact.scene.value).toBeNull(); expect(impact.busy.value).toBe(false);
    expect(impact.displayed.value.board[8]).toBe('black');
  });
  it('cancels pending effects on undo and unmount', () => {
    const [before, next] = capture(19, 5); const state = ref(before); const start = vi.fn(); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, start); return () => null; } }));
    state.value = next; state.value = { ...before, revision: 2 }; vi.advanceTimersByTime(2000);
    expect(impact.busy.value).toBe(false); expect(impact.scene.value).toBeNull(); expect(impact.displayed.value.board[8]).toBe('white');
    expect(start).toHaveBeenCalledOnce();
    state.value = { ...next, revision: 3 }; wrapper.unmount(); wrapper = undefined; vi.advanceTimersByTime(2000);
    expect(impact.busy.value).toBe(false); expect(impact.scene.value).toBeNull(); expect(start).toHaveBeenCalledTimes(2);
  });
});

describe('check and janggun taunts', () => {
  it('maps a second-player check to the correct actor', () => {
    let before = initialChessState('second-check');
    for (const [from, to] of [['e2', 'e4'], ['e7', 'e5'], ['f2', 'f3']] as const) before = applyChessMove(before, encodePieceMove(squareIndex(from), squareIndex(to)))!;
    const next = applyChessMove(before, encodePieceMove(squareIndex('d8'), squareIndex('h4')))!;
    expect(next.check).toBe('black');
    expect(next.result).toBeNull();
    const state = ref(before); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value); return () => null; } }));
    state.value = next;
    expect(impact.scene.value).toMatchObject({ actor: 'white', kind: 'check' });
  });

  it.each(['chess', 'janggi'] as const)('recognizes only a new %s check on an adjacent move', gameType => {
    const [before, next] = checkingMove(gameType);
    expect(next.check).toBe('white');
    expect(next.result).toBeNull();
    expect(impactKind(before, next)).toBe(gameType === 'chess' ? 'check' : 'janggun');
    expect(impactKind(next, next)).toBeNull();
    expect(impactKind(before, { ...next, revision: next.revision + 2 })).toBeNull();
    expect(impactKind(before, { ...next, gameId: 'reset' })).toBeNull();
    expect(impactKind(next, { ...before, revision: next.revision + 1 })).toBeNull();
    expect(impactKind(next, { ...next, revision: next.revision + 1 })).toBeNull();
    expect(impactKind({ ...before, check: next.check }, next)).toBeNull();
    expect(impactKind(before, { ...next, result: { winner: 'black', reason: 'checkmate' } })).toBeNull();
  });

  it.each(['chess', 'janggi'] as const)('shows the final %s position immediately and unblocks when its scene finishes', gameType => {
    const [before, next] = checkingMove(gameType); const state = ref(before); const start = vi.fn(); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, start); return () => null; } }));
    state.value = next;
    expect(impact.displayed.value).toEqual(next);
    expect(impact.busy.value).toBe(true);
    expect(start).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(IMPACT_MS - 1);
    expect(impact.scene.value?.actor).toBe('black');
    expect(impact.busy.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(impact.scene.value).toBeNull();
    expect(impact.busy.value).toBe(false);
  });

  it('allows an online check scene without blocking the running turn', () => {
    const [before, next] = checkingMove('chess'); const state = ref(before); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, undefined, () => false); return () => null; } }));
    state.value = next;
    expect(impact.scene.value?.kind).toBe('check');
    expect(impact.busy.value).toBe(false);
    vi.advanceTimersByTime(IMPACT_MS);
    expect(impact.scene.value).toBeNull();
  });

  it('does not replay checks on repeated or hidden snapshots and cancels on undo', () => {
    const [before, next] = checkingMove('janggi'); const state = ref(before); const start = vi.fn(); let impact!: ReturnType<typeof useMoveImpact>;
    wrapper = mount(defineComponent({ setup() { impact = useMoveImpact(() => state.value, start); return () => null; } }));
    state.value = next;
    vi.advanceTimersByTime(500);
    state.value = { ...next };
    expect(start).toHaveBeenCalledOnce();
    state.value = { ...before, revision: next.revision + 1 };
    expect(impact.scene.value).toBeNull();
    expect(impact.busy.value).toBe(false);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    state.value = { ...next, revision: next.revision + 2 };
    expect(start).toHaveBeenCalledOnce();
    expect(impact.scene.value).toBeNull();
    expect(impact.displayed.value.check).toBe('white');
  });

  it.each([['check', '체크!'], ['janggun', '장군!']] as const)('announces %s and supports the compact online banner', (kind, title) => {
    wrapper = mount(MoveImpact, { props: { actor: 'jannabi', kind, count: 0, compact: true } });
    expect(wrapper.get('.move-impact').classes()).toContain('compact');
    expect(wrapper.get('strong').text()).toBe(title);
    expect(wrapper.get('[role="status"]').attributes('aria-label')).toContain(title);
    expect(wrapper.find('.character.taunt').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('0개');
  });
});
