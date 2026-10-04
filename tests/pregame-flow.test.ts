// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import SetupPanel from '../src/components/game/SetupPanel.vue';
import GameSetupForm from '../src/components/game/GameSetupForm.vue';
import GameBoard from '../src/components/game/GameBoard.vue';
import GomokuBoard from '../src/components/game/GomokuBoard.vue';
import PieceBoard from '../src/components/game/PieceBoard.vue';
import PlayerPanel from '../src/components/game/PlayerPanel.vue';
import ModalDialog from '../src/components/common/ModalDialog.vue';
import ResultPanel from '../src/components/game/ResultPanel.vue';
import VictoryScene from '../src/components/game/VictoryScene.vue';
import * as gameController from '../src/composables/useGameController';
import * as onlineRoom from '../src/composables/useOnlineRoom';
import type { RoomSnapshot } from '../shared/protocol';
import { DEFAULT_SETTINGS, type GameSettings, type GameType } from '../shared/game/types';

let wrapper: VueWrapper | undefined;
let controller: ReturnType<typeof gameController.useGameController>;
let receiveRoom: (room: RoomSnapshot) => void;
function updateRoom(room: RoomSnapshot): void {
  controller.online.room.value = room;
  receiveRoom(room);
}

function startApp(): VueWrapper {
  wrapper = mount(App, { global: { plugins: [createPinia()] } });
  return wrapper;
}

function field(label: string): DOMWrapper<HTMLSelectElement> {
  const control = wrapper!.getComponent(GameSetupForm).findAll('label').find(candidate => candidate.text().includes(label));
  if (!control) throw new Error(`Missing pre-game setting: ${label}`);
  return control.get<HTMLSelectElement>('select');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', class { postMessage(): void {} terminate(): void {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement): void { this.open = true; },
  });
  localStorage.clear();
  localStorage.setItem('reversi-sound', 'off');
  sessionStorage.clear();
  const createOnline = onlineRoom.useOnlineRoom;
  vi.spyOn(onlineRoom, 'useOnlineRoom').mockImplementation((onState, onClosed) => {
    receiveRoom = onState;
    return createOnline(onState, onClosed);
  });
  const createController = gameController.useGameController;
  vi.spyOn(gameController, 'useGameController').mockImplementation(() => {
    controller = createController();
    vi.spyOn(controller.online, 'connect').mockImplementation(() => { controller.online.connected.value = true; });
    vi.spyOn(controller.online, 'enter').mockResolvedValue();
    vi.spyOn(controller.online, 'ready').mockImplementation(() => {});
    vi.spyOn(controller.online, 'configureRematch').mockImplementation(() => {});
    return controller;
  });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Pre-game settings in the game screen', () => {
  it.each(['ai', 'local'] as const)('reviews and changes %s settings after the result button before restarting', async mode => {
    const app = startApp();
    controller.start({ ...DEFAULT_SETTINGS, gameType: 'janggi', mode, seconds: 30, janggiBlackFormation: 'left' });
    controller.finish('black', 'resign');
    await nextTick();
    app.getComponent(VictoryScene).vm.$emit('done'); await nextTick();
    await app.getComponent(ResultPanel).get('.primary').trigger('click');
    expect(app.getComponent(GameSetupForm).props('settings')).toMatchObject({ gameType: 'janggi', mode, seconds: 30, janggiBlackFormation: 'left' });
    expect(controller.canMove.value).toBe(false);
    vi.advanceTimersByTime(90000);
    expect(controller.timeoutLoser.value).toBeNull();
    await field('한 수 제한 시간').setValue('60');
    await field('초 포진').setValue('inner');
    await app.getComponent(GameSetupForm).get('form').trigger('submit');
    expect(controller.screen.value).toBe('game');
    expect(controller.store.settings).toMatchObject({ seconds: 60, janggiBlackFormation: 'inner' });
    expect(controller.timer.remaining.value).toBe(60000);
  });

  it.each(['black', 'white'] as const)('restores the online %s rematch setup, synchronizes settings and starts only after readiness', async color => {
    const app = startApp();
    controller.online.color.value = color;
    controller.online.connected.value = true;
    const settings: GameSettings = { ...DEFAULT_SETTINGS, mode: 'online', gameType: 'janggi', seconds: 30, undoLimit: 0 };
    const room: RoomSnapshot = { code: 'ABCDEF', settings, game: null, timeout: null, deadline: null, serverNow: Date.now(), revision: 10,
      rematchSetup: 'editing', players: ['black', 'white'].map(side => ({ color: side as 'black' | 'white', connected: true, ready: false, rematch: false })) };
    updateRoom(room); await nextTick();
    expect(controller.screen.value).toBe('preparing');
    expect(controller.myColor.value).toBe(color);
    expect(controller.canMove.value).toBe(false);
    expect(controller.online.enter).not.toHaveBeenCalled();
    expect(app.getComponent(ModalDialog).props('title')).toBe('한 판 더! 이번 설정은?');
    const form = app.getComponent(GameSetupForm);
    expect(form.get(`[data-color="${color}"]`).attributes('aria-label')).toMatch(/^나 ·/);
    expect(form.get('fieldset').attributes('disabled') !== undefined).toBe(color === 'white');
    expect(form.get<HTMLButtonElement>('[type="submit"]').element.disabled).toBe(color === 'white');
    if (color === 'black') {
      await field('한 수 제한 시간').setValue('60');
      await field('초 포진').setValue('inner');
      await form.get('form').trigger('submit');
      expect(controller.online.configureRematch).toHaveBeenCalledWith(expect.objectContaining({ seconds: 60, janggiBlackFormation: 'inner' }));
    } else {
      await form.get('form').trigger('submit');
      expect(controller.online.configureRematch).not.toHaveBeenCalled();
      expect(controller.online.ready).not.toHaveBeenCalled();
    }
    const confirmed: RoomSnapshot = { ...room, revision: 11, settings: { ...settings, seconds: 60, janggiBlackFormation: 'inner' }, rematchSetup: 'ready',
      players: room.players.map(player => ({ ...player, ready: player.color === 'black' })) };
    updateRoom(confirmed); await nextTick();
    expect(field('한 수 제한 시간').element.value).toBe('60');
    expect(field('초 포진').element.value).toBe('inner');
    expect(JSON.parse(localStorage.getItem('reversi-settings')!).settings.undoLimit).toBe(DEFAULT_SETTINGS.undoLimit);
    expect(form.get('fieldset').attributes('disabled')).toBeDefined();
    expect(form.get<HTMLButtonElement>('[type="submit"]').element.disabled).toBe(color === 'black');
    vi.advanceTimersByTime(90000);
    expect(controller.timeoutLoser.value).toBeNull();
    if (color === 'white') {
      await form.get('form').trigger('submit');
      expect(controller.online.ready).toHaveBeenCalledOnce();
    }
    updateRoom({ ...confirmed, revision: 12, rematchSetup: null, game: controller.store.state, deadline: Date.now() + 60000, serverNow: Date.now() });
    await nextTick();
    expect(app.findComponent(GameSetupForm).exists()).toBe(false);
    expect(controller.screen.value).toBe('game');
    expect(controller.timer.remaining.value).toBe(60000);
  });

  it.each<GameType>(['reversi', 'gomoku', 'chess', 'janggi'])('opens %s behind the settings dialog and enables play only after confirmation', async gameType => {
    const app = startApp();
    const settings: GameSettings = { ...DEFAULT_SETTINGS, gameType, mode: 'local', blackCharacter: 'jannabi', seconds: 30 };
    const setup = app.getComponent(SetupPanel);
    expect(setup.findAll('select')).toHaveLength(0);
    setup.vm.$emit('start', settings);
    await nextTick();

    expect(app.findComponent(SetupPanel).exists()).toBe(false);
    expect(app.getComponent(ModalDialog).props('title')).toBe('우리, 한 판 놀까?');
    expect(app.getComponent(GameSetupForm).props('settings')).toMatchObject(settings);
    const board = gameType === 'reversi' ? app.getComponent(GameBoard)
      : gameType === 'gomoku' ? app.getComponent(GomokuBoard) : app.getComponent(PieceBoard);
    expect(board.props('interactive')).toBe(false);
    expect(app.findAllComponents(PlayerPanel).every(panel => !panel.props('active') && !panel.props('showActions'))).toBe(true);
    board.vm.$emit('move', controller.available.value[0]);
    vi.advanceTimersByTime(60000);
    await nextTick();
    expect(controller.store.state.revision).toBe(0);
    expect(controller.timeoutLoser.value).toBeNull();

    await field('한 수 제한 시간').setValue('60');
    await field('무르기 기회').setValue('3');
    if (gameType === 'janggi') {
      await field('초 포진').setValue('left');
      await field('한 포진').setValue('right');
    }
    await app.getComponent(GameSetupForm).get('form').trigger('submit');

    expect(app.findComponent(GameSetupForm).exists()).toBe(false);
    expect(controller.screen.value).toBe('game');
    expect(controller.store.settings).toMatchObject({ gameType, mode: 'local', blackCharacter: 'jannabi', seconds: 60, undoLimit: 3 });
    expect(controller.timer.remaining.value).toBe(60000);
    expect(board.props('interactive')).toBe(true);
    if (gameType === 'janggi') {
      expect(controller.store.settings).toMatchObject({ janggiBlackFormation: 'left', janggiWhiteFormation: 'right' });
      expect(controller.store.state.pieces?.[82]?.kind).toBe('horse');
      expect(controller.store.state.pieces?.[1]?.kind).toBe('horse');
    }
    board.vm.$emit('move', controller.available.value[0]);
    await nextTick();
    expect(controller.store.state.revision).toBe(1);
  });

  it.each(['button', 'escape'] as const)('returns to the simple selection screen when settings are cancelled with %s', async action => {
    const app = startApp();
    const setup = app.getComponent(SetupPanel);
    await setup.findAll('.game-option').find(button => button.text().includes('장기'))!.trigger('click');
    await setup.findAll('.character-option').find(button => button.text().includes('잔나비'))!.trigger('click');
    await setup.get('.start-button').trigger('click');
    if (action === 'button') await app.getComponent(GameSetupForm).get('button[type="button"]').trigger('click');
    else await app.getComponent(ModalDialog).get('dialog').trigger('cancel');
    await flushPromises();
    expect(controller.screen.value).toBe('setup');
    expect(controller.store.active).toBe(false);
    expect(app.findComponent(GameSetupForm).exists()).toBe(false);
    expect(app.getComponent(SetupPanel).get('.game-option.selected').text()).toContain('장기');
    expect(app.getComponent(SetupPanel).get('.character-option.chosen').text()).toContain('잔나비');
    vi.advanceTimersByTime(60000);
    expect(controller.timeoutLoser.value).toBeNull();
  });

  it('does not create an online room or ready a player until host settings are confirmed', async () => {
    const app = startApp();
    const setup = app.getComponent(SetupPanel);
    await setup.findAll('.mode-tabs button').find(button => button.text() === '온라인')!.trigger('click');
    await setup.findAll('.game-option').find(button => button.text().includes('장기'))!.trigger('click');
    await setup.get('.start-button').trigger('click');
    expect(controller.screen.value).toBe('preparing');
    expect(controller.online.enter).not.toHaveBeenCalled();
    expect(controller.online.ready).not.toHaveBeenCalled();
    expect(controller.online.room.value).toBeNull();
    expect(controller.store.active).toBe(false);
    expect(app.getComponent(PieceBoard).props('interactive')).toBe(false);
    await field('한 수 제한 시간').setValue('60');
    await field('초 포진').setValue('inner');
    await field('한 포진').setValue('left');
    await app.getComponent(GameSetupForm).get('form').trigger('submit');
    expect(controller.online.enter).toHaveBeenCalledExactlyOnceWith('create', expect.objectContaining({ gameType: 'janggi', mode: 'online', seconds: 60, janggiBlackFormation: 'inner', janggiWhiteFormation: 'left' }));
    expect(controller.online.ready).not.toHaveBeenCalled();
    expect(controller.store.active).toBe(false);
    expect(controller.canMove.value).toBe(false);
  });

  it('keeps failed online creation in the settings dialog so the host can retry', async () => {
    const app = startApp();
    controller.online.connected.value = true;
    app.getComponent(SetupPanel).vm.$emit('create', { ...DEFAULT_SETTINGS, mode: 'online', gameType: 'chess' });
    await nextTick();
    vi.mocked(controller.online.enter).mockImplementation(async () => { controller.online.error.value = '서버 응답이 늦어지고 있습니다.'; });
    await app.getComponent(GameSetupForm).get('form').trigger('submit');
    await flushPromises();
    expect(controller.screen.value).toBe('preparing');
    expect(app.getComponent(GameSetupForm).get('[role="alert"]').text()).toContain('서버 응답');
    expect(app.getComponent(GameSetupForm).get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false);
    expect(controller.online.room.value).toBeNull();
    expect(controller.store.active).toBe(false);
  });

  it('joins an existing friend room directly without overriding the host settings', async () => {
    const app = startApp();
    const settings: GameSettings = { ...DEFAULT_SETTINGS, mode: 'online', gameType: 'chess' };
    app.getComponent(SetupPanel).vm.$emit('join', settings, 'ABCDEF');
    await nextTick();
    expect(controller.online.enter).toHaveBeenCalledExactlyOnceWith('join', settings, 'ABCDEF');
    expect(app.findComponent(GameSetupForm).exists()).toBe(false);
    expect(controller.online.ready).not.toHaveBeenCalled();
    expect(controller.store.active).toBe(false);
  });
});
