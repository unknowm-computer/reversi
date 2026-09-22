// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import GameBoard from '../src/components/game/GameBoard.vue';
import { useGamepad } from '../src/composables/useGamepad';

let wrapper: VueWrapper | undefined;
let tick: FrameRequestCallback;
let pads: (Gamepad | null)[];
let pad: Gamepad;
let enabled = ref(true);
let input: ReturnType<typeof useGamepad>;
const direction = vi.fn(), confirm = vi.fn(), cancel = vi.fn();
function button(index: number, pressed: boolean): void {
  (pad.buttons as GamepadButton[])[index] = { pressed, touched: pressed, value: pressed ? 1 : 0 };
}
function start(): void {
  wrapper = mount(defineComponent({ setup() { input = useGamepad(enabled, { direction, confirm }); return () => null; } }));
}
beforeEach(() => {
  vi.clearAllMocks(); enabled = ref(true);
  pad = { id: 'test-pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: 0, vibrationActuator: null } as unknown as Gamepad;
  pads = [null, pad];
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: vi.fn(() => pads) });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { tick = callback; return 42; });
  vi.stubGlobal('cancelAnimationFrame', cancel);
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); Reflect.deleteProperty(navigator, 'getGamepads'); vi.unstubAllGlobals(); });

describe('gamepad input', () => {
  it('detects connection and requires release before the first action', () => {
    button(0, true); start(); tick(0); tick(16);
    expect(input.status.value).toBe('connected'); expect(confirm).not.toHaveBeenCalled();
    button(0, false); tick(32); button(0, true); tick(48); tick(64);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('moves with D-pad and repeats only after the initial delay', () => {
    start(); tick(0); button(15, true); tick(16); tick(300);
    expect(direction).toHaveBeenCalledTimes(1); expect(direction).toHaveBeenLastCalledWith('ArrowRight');
    tick(336); tick(455); expect(direction).toHaveBeenCalledTimes(2);
    tick(456); expect(direction).toHaveBeenCalledTimes(3);
    button(15, false); button(12, true); tick(470); expect(direction).toHaveBeenLastCalledWith('ArrowUp');
  });
  it('ignores stick drift and uses the dominant axis for diagonals', () => {
    start(); tick(0); (pad.axes as number[]).splice(0, 2, 0.3, -0.2); tick(16);
    expect(direction).not.toHaveBeenCalled();
    (pad.axes as number[]).splice(0, 2, -0.8, 0.6); tick(32); expect(direction).toHaveBeenLastCalledWith('ArrowLeft');
    (pad.axes as number[]).splice(0, 2, 0.7, 0.9); tick(48); expect(direction).toHaveBeenLastCalledWith('ArrowDown');
  });
  it('discards held input across AI turns, dialogs and other locks', () => {
    start(); tick(0); enabled.value = false; button(0, true); button(13, true); tick(16);
    enabled.value = true; tick(32); tick(500); expect(confirm).not.toHaveBeenCalled(); expect(direction).not.toHaveBeenCalled();
    button(0, false); button(13, false); tick(516); button(0, true); tick(532); expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('requires release after blur and visibility changes', () => {
    start(); tick(0); window.dispatchEvent(new Event('blur')); button(0, true); tick(16);
    window.dispatchEvent(new Event('focus')); tick(32); expect(confirm).not.toHaveBeenCalled();
    button(0, false); tick(48); Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange')); button(0, true); tick(64);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); tick(80);
    expect(confirm).not.toHaveBeenCalled(); button(0, false); tick(96); button(0, true); tick(112); expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('resets on disconnect and safely switches to another standard pad', () => {
    start(); tick(0); button(15, true); tick(16); expect(input.active.value).toBe(true);
    pads = []; tick(32); expect(input.status.value).toBe('waiting'); expect(input.active.value).toBe(false);
    pads = [pad]; tick(48); expect(direction).toHaveBeenCalledTimes(1);
    button(15, false); tick(64); button(0, true); tick(80); expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('does not guess button mappings for unsupported devices', () => {
    pad = { ...pad, mapping: '' }; pads = [pad]; start(); tick(0); button(0, true); tick(16);
    expect(input.status.value).toBe('unsupported'); expect(confirm).not.toHaveBeenCalled();
  });
  it('handles browser API failures without breaking the game', () => {
    vi.mocked(navigator.getGamepads).mockImplementation(() => { throw new Error('blocked'); });
    start(); tick(0); expect(input.status.value).toBe('unavailable');
  });
  it('cleans up polling and hides the pad cursor for pointer input', () => {
    start(); tick(0); button(12, true); tick(16); window.dispatchEvent(new Event('pointerdown')); expect(input.active.value).toBe(false);
    wrapper!.unmount(); wrapper = undefined; expect(cancel).toHaveBeenCalledWith(42);
  });
});


describe('gamepad board integration', () => {
  it('shares the keyboard cursor, rejects illegal moves and respects the input lock', async () => {
    wrapper = mount(GameBoard, { attachTo: document.body, props: { board: Array(64).fill(null), legal: [19], turn: 'black', interactive: true, lastMove: null, flipped: [], revision: 0 } });
    tick(0); button(14, true); tick(16); await wrapper.vm.$nextTick();
    expect(wrapper.find('.pad-cursor').attributes('data-cell')).toBe('18');
    button(14, false); button(0, true); tick(32); expect(wrapper.emitted('move')).toBeUndefined();
    button(0, false); tick(48); button(15, true); tick(64); button(15, false); button(0, true); tick(80);
    expect(wrapper.emitted('move')).toEqual([[19]]);
    await wrapper.setProps({ interactive: false }); tick(96); expect(wrapper.find('.pad-cursor').exists()).toBe(false);
    await wrapper.setProps({ interactive: true }); tick(112); expect(wrapper.emitted('move')).toEqual([[19]]);
    button(0, false); tick(128);
    await wrapper.get('[data-cell="19"]').trigger('keydown', { key: 'ArrowLeft' });
    button(0, true); tick(144); expect(wrapper.emitted('move')).toEqual([[19]]);
    await wrapper.get('[data-cell="18"]').trigger('keydown', { key: 'ArrowRight' });
    button(0, false); tick(160); button(0, true); tick(176); expect(wrapper.emitted('move')).toEqual([[19], [19]]);
  });
});
