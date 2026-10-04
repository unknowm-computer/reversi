// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import SetupPanel from '../src/components/game/SetupPanel.vue';
import GameSetupForm from '../src/components/game/GameSetupForm.vue';
import { SETUP_SETTINGS_KEY, useSetupSettings } from '../src/composables/useSetupSettings';
import { DEFAULT_SETTINGS, type GameSettings } from '../shared/game/types';

let wrapper: VueWrapper | undefined;
function openSetup(): VueWrapper {
  wrapper = mount(SetupPanel, { props: { connected: true, busy: false, error: '' } });
  return wrapper;
}
function openPreferences(): GameSettings {
  let config!: GameSettings;
  wrapper = mount(defineComponent({
    setup() {
      config = useSetupSettings().config;
      return () => h('div');
    },
  }));
  return config;
}
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('remembered setup settings', () => {
  it('uses the existing defaults on the first visit', async () => {
    const setup = openSetup();
    await setup.get('.start-button').trigger('click');
    expect(setup.emitted('start')?.[0]?.[0]).toEqual(DEFAULT_SETTINGS);
  });

  it('remembers basic choices and settings confirmed on the game screen for the next visit', async () => {
    const setup = openSetup();
    await setup.findAll('.game-option')[1].trigger('click');
    await setup.findAll('.character-option')[1].trigger('click');
    expect(setup.find('select').exists()).toBe(false);
    await setup.get('.start-button').trigger('click');
    const selected = setup.emitted('start')![0][0] as GameSettings;
    setup.unmount();
    const details = mount(GameSetupForm, { props: { settings: selected, busy: false, connected: true, error: '' } });
    wrapper = details;
    await details.findAll('select')[0].setValue('5');
    await details.findAll('select')[1].setValue('60');
    await details.get('form').trigger('submit');
    expect(details.emitted('confirm')?.[0]?.[0]).toMatchObject({ gameType: 'gomoku', blackCharacter: 'jannabi', aiDifficulty: 5, seconds: 60 });
    expect(localStorage.getItem(SETUP_SETTINGS_KEY)).not.toBeNull();
    details.unmount();

    const restored = openSetup();
    expect(restored.emitted('gameType')).toEqual([['gomoku']]);
    expect(restored.findAll('.character-option')[1].attributes('aria-pressed')).toBe('true');
    expect(restored.find('select').exists()).toBe(false);
    await restored.get('.start-button').trigger('click');
    expect(restored.emitted('start')?.[0]?.[0]).toMatchObject({ gameType: 'gomoku', blackCharacter: 'jannabi', aiDifficulty: 5, seconds: 60 });
  });

  it('restores the local undo limit and independent mode times across remounting', () => {
    const config = openPreferences();
    config.seconds = 60;
    config.mode = 'local';
    expect(config.seconds).toBe(30);
    config.seconds = 0;
    config.undoLimit = -1;
    config.mode = 'online';
    config.seconds = 60;
    config.mode = 'local';
    wrapper!.unmount();

    const restored = openPreferences();
    expect(restored).toMatchObject({ mode: 'local', seconds: 0, undoLimit: -1 });
    restored.mode = 'ai';
    expect(restored.seconds).toBe(60);
    restored.mode = 'online';
    expect(restored.seconds).toBe(60);
  });

  it('connects automatically when the remembered mode is online', async () => {
    localStorage.setItem(SETUP_SETTINGS_KEY, JSON.stringify({ settings: { ...DEFAULT_SETTINGS, mode: 'online', gameType: 'gomoku', seconds: 60 } }));
    const setup = openSetup();
    expect(setup.emitted('online')).toEqual([[]]);
    expect(setup.emitted('gameType')).toEqual([['gomoku']]);
    await setup.get('.start-button').trigger('click');
    expect(setup.emitted('create')?.[0]?.[0]).toMatchObject({ mode: 'online', gameType: 'gomoku', seconds: 60 });
  });

  it.each(['{broken', 'null', '[]'])('ignores malformed stored settings: %s', async saved => {
    localStorage.setItem(SETUP_SETTINGS_KEY, saved);
    const setup = openSetup();
    await setup.get('.start-button').trigger('click');
    expect(setup.emitted('start')?.[0]?.[0]).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects unsupported values while keeping valid preferences', async () => {
    localStorage.setItem(SETUP_SETTINGS_KEY, JSON.stringify({ settings: { gameType: 'gomoku', mode: 'invalid', seconds: 15, undoLimit: 10, blackCharacter: 'unknown', aiDifficulty: '5' }, modeSeconds: { ai: -1, local: 15, online: '60' } }));
    const setup = openSetup();
    await setup.get('.start-button').trigger('click');
    expect(setup.emitted('start')?.[0]?.[0]).toEqual({ ...DEFAULT_SETTINGS, gameType: 'gomoku' });
    await setup.findAll('.mode-tabs button')[1].trigger('click');
    await setup.get('.start-button').trigger('click');
    expect(setup.emitted('start')?.at(-1)?.[0]).toMatchObject({ mode: 'local', seconds: 30 });
  });

  it('keeps setup usable when storage reads and writes fail', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    const setup = openSetup();
    await setup.findAll('.game-option')[1].trigger('click');
    await setup.get('.start-button').trigger('click');
    expect(setup.emitted('start')?.[0]?.[0]).toEqual({ ...DEFAULT_SETTINGS, gameType: 'gomoku' });
  });
});
