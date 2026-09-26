// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import VictoryScene from '../src/components/game/VictoryScene.vue';
import ResultPanel from '../src/components/game/ResultPanel.vue';
import SetupPanel from '../src/components/game/SetupPanel.vue';
import { useGameStore } from '../src/stores/game';
import { DEFAULT_SETTINGS } from '../shared/game/types';
let wrapper: VueWrapper | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  localStorage.setItem('reversi-sound', 'off'); sessionStorage.clear();
});
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('Character victory', () => {
  it('plays a hit then completes, and skipping cancels remaining events', async () => {
    wrapper = mount(VictoryScene);
    vi.advanceTimersByTime(1279); await nextTick();
    expect(wrapper.emitted('hit')).toBeUndefined();
    vi.advanceTimersByTime(1); expect(wrapper.emitted('hit')).toHaveLength(1);
    await wrapper.get('button').trigger('click');
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(4000); expect(wrapper.emitted('done')).toHaveLength(1);
  });
  it.each(['skip', 'escape'] as const)('cancels before impact with %s without playing a late hit', async (action) => {
    wrapper = mount(VictoryScene);
    vi.advanceTimersByTime(480);
    if (action === 'skip') await wrapper.get('button').trigger('click');
    else await wrapper.get('dialog').trigger('cancel');
    expect(wrapper.emitted('done')).toHaveLength(1);
    expect(wrapper.emitted('hit')).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    await wrapper.get('button').trigger('click');
    vi.advanceTimersByTime(4000);
    expect(wrapper.emitted('done')).toHaveLength(1);
    expect(wrapper.emitted('hit')).toBeUndefined();
  });
  it('finishes the full baseball swing with exactly one impact and no timers left running', () => {
    wrapper = mount(VictoryScene);
    vi.advanceTimersByTime(3199);
    expect(wrapper.emitted('done')).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(wrapper.emitted('hit')).toHaveLength(1);
    expect(wrapper.emitted('done')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('lands five lariat hits before the result and cancels the combo when skipped', async () => {
    wrapper = mount(VictoryScene, { props: { winner: 'jannabi' } });
    vi.advanceTimersByTime(959); expect(wrapper.emitted('hit')).toBeUndefined();
    vi.advanceTimersByTime(1); expect(wrapper.emitted('hit')).toHaveLength(1);
    vi.advanceTimersByTime(1280); await nextTick();
    expect(wrapper.emitted('hit')).toHaveLength(5);
    expect(wrapper.get('.finishing').text()).toContain('퍼엉');
    expect(wrapper.emitted('done')).toBeUndefined();
    vi.advanceTimersByTime(960); expect(wrapper.emitted('done')).toHaveLength(1);
    wrapper.unmount();
    wrapper = mount(VictoryScene, { props: { winner: 'jannabi' } });
    vi.advanceTimersByTime(960); await wrapper.get('button').trigger('click');
    vi.advanceTimersByTime(4000); expect(wrapper.emitted('hit')).toHaveLength(1);
    expect(wrapper.emitted('done')).toHaveLength(1);
  });
  it('cleans up timers when the game scene is removed', () => {
    wrapper = mount(VictoryScene); const scene = wrapper;
    wrapper.unmount(); wrapper = undefined; vi.advanceTimersByTime(4000);
    expect(scene.emitted('hit')).toBeUndefined(); expect(scene.emitted('done')).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('goes directly to the result when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    wrapper = mount(VictoryScene); expect(wrapper.emitted('done')).toHaveLength(1);
    vi.advanceTimersByTime(4000); expect(wrapper.emitted('hit')).toBeUndefined();
  });
  it.each(['jannabi', 'grasshopper'] as const)('shows the %s winner portrait after the scene without replaying repeated snapshots', async (blackCharacter) => {
    const pinia = createPinia(); setActivePinia(pinia);
    wrapper = mount(App, { global: { plugins: [pinia] } });
    wrapper.getComponent(SetupPanel).vm.$emit('start', { ...DEFAULT_SETTINGS, mode: 'local', seconds: 0, blackCharacter });
    await nextTick(); const store = useGameStore(); store.finish('black', 'resign'); await nextTick();
    expect(wrapper.getComponent(VictoryScene).props('winner')).toBe(blackCharacter === 'jannabi' ? 'grasshopper' : 'jannabi');
    expect(wrapper.findComponent(ResultPanel).exists()).toBe(false);
    vi.advanceTimersByTime(3200); await nextTick();
    expect(wrapper.findComponent(VictoryScene).exists()).toBe(false);
    expect(wrapper.getComponent(ResultPanel).find('svg.portrait.still.mood-win').exists()).toBe(true);
    expect(wrapper.getComponent(ResultPanel).find('.beer-toast').exists()).toBe(blackCharacter === 'grasshopper');
    store.state = { ...store.state }; await nextTick();
    expect(wrapper.findComponent(VictoryScene).exists()).toBe(false);
    wrapper.getComponent(ResultPanel).vm.$emit('rematch'); await nextTick();
    store.finish('black', 'resign'); await nextTick();
    expect(wrapper.findComponent(VictoryScene).exists()).toBe(true);
  });
  it('shows both portraits immediately for a draw', async () => {
    const winner = null;
    const pinia = createPinia(); setActivePinia(pinia);
    wrapper = mount(App, { global: { plugins: [pinia] } });
    wrapper.getComponent(SetupPanel).vm.$emit('start', { ...DEFAULT_SETTINGS, mode: 'local', seconds: 0, blackCharacter: 'jannabi' });
    await nextTick(); const store = useGameStore();
    store.state = { ...store.state, result: { winner, reason: 'noLegalMoves' } }; await nextTick();
    expect(wrapper.findComponent(VictoryScene).exists()).toBe(false);
    expect(wrapper.getComponent(ResultPanel).findAll('.result-face')).toHaveLength(winner ? 1 : 2);
  });
});
