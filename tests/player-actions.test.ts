// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import ModalDialog from '../src/components/common/ModalDialog.vue';
import PlayerPanel from '../src/components/game/PlayerPanel.vue';
import SetupPanel from '../src/components/game/SetupPanel.vue';
import VictoryScene from '../src/components/game/VictoryScene.vue';
import { useGameStore } from '../src/stores/game';
import * as gameController from '../src/composables/useGameController';
import { opposite } from '../shared/game/rules';
import { DEFAULT_SETTINGS, TIMEOUT_PENALTY_MS, type Cell, type Color, type GameSettings, type GameState } from '../shared/game/types';

let wrapper: VueWrapper | undefined;
let store: ReturnType<typeof useGameStore>;

async function start(settings: Partial<GameSettings> = {}): Promise<void> {
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(App, { global: { plugins: [pinia] } });
  store = useGameStore();
  wrapper.getComponent(SetupPanel).vm.$emit('start', { ...DEFAULT_SETTINGS, mode: 'local', seconds: 0, ...settings });
  await nextTick();
}

function action(color: Color, text: string): DOMWrapper<HTMLButtonElement> {
  const panel = wrapper!.findAllComponents(PlayerPanel).find(candidate => candidate.props('color') === color);
  const button = panel?.findAll<HTMLButtonElement>('button').find(candidate => candidate.text().includes(text));
  if (!button) throw new Error(`Missing ${color} player action: ${text}`);
  return button;
}

function dialogAction(text: string): DOMWrapper<HTMLButtonElement> {
  const button = wrapper!.getComponent(ModalDialog).findAll<HTMLButtonElement>('button').find(candidate => candidate.text() === text);
  if (!button) throw new Error(`Missing dialog action: ${text}`);
  return button;
}

async function move(index: number): Promise<void> {
  await wrapper!.get(`[data-cell="${index}"]`).trigger('click');
  vi.advanceTimersByTime(500);
  await nextTick();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', class { postMessage(): void {} terminate(): void {} });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement): void { this.open = true; },
  });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  localStorage.setItem('reversi-sound', 'off');
  sessionStorage.clear();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Turn-based player actions', () => {
  it('selects a solo character and difficulty, then restarts from the header with the same settings', async () => {
    const pinia = createPinia(); setActivePinia(pinia);
    wrapper = mount(App, { global: { plugins: [pinia] } }); store = useGameStore();
    const setup = wrapper.getComponent(SetupPanel);
    await setup.findAll('button').find(button => button.text().includes('장난꾸러기 승부사'))!.trigger('click');
    await setup.get('.settings-row select').setValue('4');
    expect(setup.get('.opponent-note').text()).toContain('베짱이 AI');
    expect(setup.get('.settings-row select').findAll('option')).toHaveLength(5);
    await setup.get('.start-button').trigger('click');
    expect(store.settings).toMatchObject({ mode: 'ai', blackCharacter: 'jannabi', aiDifficulty: 4 });
    expect(wrapper.find('.restart-button').exists()).toBe(false);
    const originalGame = store.state.gameId;
    await action('black', '기권하기').trigger('click');
    await dialogAction('기권하기').trigger('click');
    wrapper.getComponent(VictoryScene).vm.$emit('done'); await nextTick();
    wrapper.getComponent(ModalDialog).vm.$emit('close'); await nextTick();
    await wrapper.get('.restart-button').trigger('click');
    expect(wrapper.findComponent(SetupPanel).exists()).toBe(false);
    expect(store.state.gameId).not.toBe(originalGame);
    expect(store.settings).toMatchObject({ blackCharacter: 'jannabi', aiDifficulty: 4, seconds: 30 });
    expect(store.state.result).toBeNull();
    expect(store.counts).toEqual({ black: 2, white: 2, empty: 60 });
    expect(action('black', '힌트').element.disabled).toBe(false);
    expect(wrapper.find('.restart-button').exists()).toBe(false);
  });

  it.each(['black', 'white'] as const)('shows a waiting dialog to the timed-out online %s player until the opponent decides', async color => {
    const createController = gameController.useGameController;
    let controller!: ReturnType<typeof createController>;
    vi.spyOn(gameController, 'useGameController').mockImplementation(() => {
      controller = createController();
      return controller;
    });
    await start({ mode: 'online', seconds: 30 });
    controller.online.color.value = color;
    controller.online.connected.value = true;
    const room = {
      code: 'ABCDEF', settings: store.settings, players: [], game: store.state,
      deadline: null, serverNow: Date.now(), revision: 2,
      timeout: { phase: 'decision' as const, loser: color },
    };
    controller.online.room.value = room;
    await nextTick();
    const dialog = wrapper!.getComponent(ModalDialog);
    expect(dialog.props('title')).toBe('상대의 결정을 기다리고 있어요');
    expect(dialog.props('dismissible')).toBe(false);
    expect(dialog.findAll('button')).toHaveLength(0);
    await dialog.get('dialog').trigger('cancel');
    expect(wrapper!.getComponent(ModalDialog).exists()).toBe(true);
    expect(controller.canMove.value).toBe(false);

    controller.online.color.value = opposite(color);
    await nextTick();
    expect(dialogAction('봐준다').exists()).toBe(true);
    expect(dialogAction('게임 종료').exists()).toBe(true);
    controller.online.color.value = color;
    controller.online.room.value = { ...room, timeout: { phase: 'penalty', loser: color, resumesAt: Date.now() + TIMEOUT_PENALTY_MS } };
    await nextTick();
    expect(wrapper!.findComponent(ModalDialog).exists()).toBe(false);

    controller.online.room.value = { ...room, revision: 3 };
    await nextTick();
    expect(wrapper!.getComponent(ModalDialog).props('title')).toBe('상대의 결정을 기다리고 있어요');
    store.finish(color, 'timeout');
    controller.online.room.value = { ...room, game: store.state, timeout: null, revision: 4 };
    await nextTick();
    expect(wrapper!.findAllComponents(ModalDialog).some(modal => modal.props('title') === '상대의 결정을 기다리고 있어요')).toBe(false);
  });

  it('shows unlimited solo hints on the board without placing a stone, then clears the hint on a move', async () => {
    let hintWorker: HintWorker | undefined;
    class HintWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      request: GameState | null = null;
      constructor() { hintWorker = this; }
      postMessage(state: GameState): void { this.request = state; }
      terminate(): void {}
    }
    vi.stubGlobal('Worker', HintWorker);
    await start({ mode: 'ai' });
    const before = JSON.stringify(store.state);
    await action('black', '힌트').trigger('click');
    expect(action('black', '힌트').element.disabled).toBe(true);
    hintWorker!.onmessage?.({ data: { gameId: hintWorker!.request!.gameId, revision: 0, index: 19 } } as MessageEvent);
    await nextTick();
    expect(wrapper!.get('[data-cell="19"]').attributes('aria-label')).toContain('힌트 추천');
    expect(wrapper!.findAll('.suggestion-marker')).toHaveLength(1);
    expect(JSON.stringify(store.state)).toBe(before);
    for (let i = 0; i < 5; i++) {
      expect(action('black', '힌트').element.disabled).toBe(false);
      await action('black', '힌트').trigger('click');
    }
    expect(wrapper!.findAll('.suggestion-marker')).toHaveLength(1);
    await move(19);
    expect(wrapper!.find('.suggestion-marker').exists()).toBe(false);
    expect(wrapper!.find('.hint-action').exists()).toBe(false);
  });

  it.each(['ai', 'local'] as const)('asks for a timeout decision at zero in %s', async mode => {
    await start({ mode, seconds: 30 });
    vi.advanceTimersByTime(30000); await nextTick();
    expect(wrapper!.getComponent(ModalDialog).props('dismissible')).toBe(false);
    expect(wrapper!.getComponent(ModalDialog).text()).toContain(mode === 'ai' ? '시간 초과… 한 번만 봐주세요!' : '시간 초과! 한 번 봐줄까요?');
    expect(store.state.result).toBeNull();
    if (mode === 'ai') expect(action('black', '힌트').element.disabled).toBe(true);
    expect(dialogAction(mode === 'ai' ? '패배를 인정한다' : '게임 종료').exists()).toBe(true);
    await dialogAction(mode === 'ai' ? '제발 봐주세요' : '봐준다').trigger('click');
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS); await nextTick();
    expect(wrapper!.findComponent(ModalDialog).exists()).toBe(false);
    expect(wrapper!.get('.timer').attributes('aria-label')).toBe('남은 시간 30초');
  });

  it('turns the active timer red at ten seconds, before the final five seconds', async () => {
    await start({ seconds: 30 });
    vi.advanceTimersByTime(19900);
    await nextTick();
    expect(wrapper!.find('.timer.urgent').exists()).toBe(false);
    vi.advanceTimersByTime(100);
    await nextTick();
    expect(wrapper!.get('.timer.urgent').attributes('aria-label')).toBe('남은 시간 10초');
    expect(wrapper!.findAll('.timer')).toHaveLength(1);
  });

  it.each(['black', 'white'] as const)('resigns the %s panel owner during their turn', async color => {
    await start();
    if (color === 'white') await move(19);
    expect(store.state.turn).toBe(color);
    expect(wrapper!.findAll('.player-actions')).toHaveLength(1);

    await action(color, '기권하기').trigger('click');
    expect(wrapper!.getComponent(ModalDialog).text()).toContain(`${color === 'black' ? '베짱이' : '잔나비'}의 기권`);
    await dialogAction('기권하기').trigger('click');

    expect(store.state.result).toEqual({ winner: opposite(color), reason: 'resign' });
  });

  it('keeps the selected resigning player when the turn changes before confirmation', async () => {
    await start();
    await action('black', '기권하기').trigger('click');
    // A state update after opening the dialog must not change whose action is being confirmed.
    expect(store.move(19, 0)).toBe(true);
    await nextTick();
    expect(store.state.turn).toBe('white');
    expect(wrapper!.getComponent(ModalDialog).text()).toContain('베짱이의 기권');

    await dialogAction('기권하기').trigger('click');
    expect(store.state.result).toEqual({ winner: 'white', reason: 'resign' });
  });

  it('shows controls only on the current local player and spends their own undo chance', async () => {
    await start({ undoLimit: 3 });
    expect(wrapper!.find('.hint-action').exists()).toBe(false);
    const initialBoard = [...store.state.board];
    expect(action('black', '한 수 무르기').element.disabled).toBe(true);
    expect(action('black', '한 수 무르기').text()).toContain('(3)');
    expect(wrapper!.findAllComponents(PlayerPanel).find(panel => panel.props('color') === 'white')!.find('button').exists()).toBe(false);

    await move(19);
    expect(action('white', '한 수 무르기').element.disabled).toBe(true);
    expect(wrapper!.findAllComponents(PlayerPanel).find(panel => panel.props('color') === 'black')!.find('button').exists()).toBe(false);
    await move(18);
    expect(action('black', '한 수 무르기').element.disabled).toBe(false);
    await action('black', '한 수 무르기').trigger('click');
    expect(store.state.board).toEqual(initialBoard);
    expect(store.state.turn).toBe('black');
    expect(store.undoUsed).toEqual({ black: 1, white: 0 });
    expect(action('black', '한 수 무르기').text()).toContain('(2)');
  });

  it('hides AI controls and allows unlimited human undo once the AI replies', async () => {
    await start({ mode: 'ai' });
    const initialBoard = [...store.state.board];
    expect(action('black', '한 수 무르기').text()).toContain('(∞)');
    await move(19);
    expect(wrapper!.findAll('.player-actions')).toHaveLength(0);
    store.move(18, 0);
    await nextTick();
    expect(action('black', '한 수 무르기').element.disabled).toBe(false);
    await action('black', '한 수 무르기').trigger('click');
    expect(store.state.board).toEqual(initialBoard);
    expect(action('black', '한 수 무르기').text()).toContain('(∞)');
  });

  it('never exposes opponent actions online and keeps online undo disabled', async () => {
    await start({ mode: 'online' });
    expect(wrapper!.find('.hint-action').exists()).toBe(false);
    expect(action('black', '한 수 무르기').text()).toContain('(0)');
    expect(action('black', '한 수 무르기').element.disabled).toBe(true);
    store.move(19, 0);
    await nextTick();
    expect(wrapper!.findAll('.player-actions')).toHaveLength(0);
    const opponent = wrapper!.findAllComponents(PlayerPanel).find(panel => panel.props('color') === 'white')!;
    opponent.vm.$emit('resign');
    opponent.vm.$emit('undo');
    await nextTick();
    expect(wrapper!.findComponent(ModalDialog).exists()).toBe(false);
    expect(store.history).toHaveLength(1);
    expect(opponent.find('.turn-indicator').exists()).toBe(true);
  });

  it('keeps undo on the last mover’s panel after the opponent automatically passes', async () => {
    await start();
    const board: Cell[] = Array(64).fill('black');
    board[0] = null; board[1] = 'white'; board[3] = null; board[4] = 'white';
    store.state = { ...store.state, board };
    await nextTick();
    await move(0);

    expect(store.state.passed).toBe('white');
    expect(store.state.turn).toBe('black');
    expect(action('black', '한 수 무르기').element.disabled).toBe(false);
    expect(wrapper!.findAll('.player-actions')).toHaveLength(1);
    await action('black', '한 수 무르기').trigger('click');
    expect(store.state.board).toEqual(board);
    expect(store.undoUsed).toEqual({ black: 1, white: 0 });
  });

  it('blocks panel undo during a timeout decision and penalty, then restores the current player’s action', async () => {
    await start({ seconds: 30 });
    await move(19);
    await move(18);
    vi.advanceTimersByTime(30000);
    await nextTick();
    expect(action('black', '한 수 무르기').element.disabled).toBe(true);
    expect(action('black', '기권하기').element.disabled).toBe(true);
    await action('black', '한 수 무르기').trigger('click');
    expect(store.history).toHaveLength(2);

    await dialogAction('봐준다').trigger('click');
    expect(action('black', '한 수 무르기').element.disabled).toBe(true);
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS);
    await nextTick();
    expect(action('black', '한 수 무르기').element.disabled).toBe(false);
    expect(wrapper!.findAll('.player-actions')).toHaveLength(1);
  });
});
