// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import SetupPanel from '../src/components/game/SetupPanel.vue';
import { SETUP_SETTINGS_KEY } from '../src/composables/useSetupSettings';
import { DEFAULT_SETTINGS } from '../shared/game/types';

let wrapper: VueWrapper | undefined;
function openSetup(): VueWrapper {
  wrapper = mount(SetupPanel, { props: { connected: true, busy: false, error: '' } });
  return wrapper;
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

  it('saves changes before starting and restores the game, character, difficulty and time on the next visit', async () => {
    const setup = openSetup();
    await setup.findAll('.game-option')[1].trigger('click');
    await setup.findAll('.character-option')[1].trigger('click');
    await setup.findAll('select')[0].setValue('5');
    await setup.findAll('select')[1].setValue('60');
    expect(localStorage.getItem(SETUP_SETTINGS_KEY)).not.toBeNull();
    setup.unmount();

    const restored = openSetup();
    expect(restored.emitted('gameType')).toEqual([['gomoku']]);
    expect(restored.findAll('.character-option')[1].attributes('aria-pressed')).toBe('true');
    expect(restored.findAll('select').map(select => (select.element as HTMLSelectElement).value)).toEqual(['5', '60']);
    await restored.get('.start-button').trigger('click');
    expect(restored.emitted('start')?.[0]?.[0]).toMatchObject({ gameType: 'gomoku', blackCharacter: 'jannabi', aiDifficulty: 5, seconds: 60 });
  });

  it('restores the local mode and undo limit and preserves independent times across mode changes and remounting', async () => {
    const setup = openSetup();
    await setup.findAll('select')[1].setValue('60');
    await setup.findAll('.mode-tabs button')[1].trigger('click');
    expect((setup.findAll('select')[0].element as HTMLSelectElement).value).toBe('30');
    await setup.findAll('select')[0].setValue('0');
    await setup.findAll('select')[1].setValue('-1');
    await setup.findAll('.mode-tabs button')[2].trigger('click');
    await setup.get('select').setValue('60');
    await setup.findAll('.mode-tabs button')[1].trigger('click');
    setup.unmount();

    const restored = openSetup();
    expect(restored.findAll('.mode-tabs button')[1].attributes('aria-pressed')).toBe('true');
    await restored.get('.start-button').trigger('click');
    expect(restored.emitted('start')?.[0]?.[0]).toMatchObject({ mode: 'local', seconds: 0, undoLimit: -1 });
    await restored.findAll('.mode-tabs button')[0].trigger('click');
    expect((restored.findAll('select')[1].element as HTMLSelectElement).value).toBe('60');
    await restored.findAll('.mode-tabs button')[2].trigger('click');
    expect((restored.get('select').element as HTMLSelectElement).value).toBe('60');
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
    expect((setup.findAll('select')[0].element as HTMLSelectElement).value).toBe('30');
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
