// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { DEFAULT_SETTINGS, type Color, type GameResult, type GameSettings, type GameType, type JanggiFormation, type Mode } from '../shared/game/types';
import { initialState } from '../shared/game/engine';
import { SETUP_SETTINGS_KEY } from '../src/composables/useSetupSettings';
import SetupPanel from '../src/components/game/SetupPanel.vue';
import GameSetupForm from '../src/components/game/GameSetupForm.vue';
import JanggiFormationPreview from '../src/components/game/JanggiFormationPreview.vue';
import PieceArt from '../src/components/game/PieceArt.vue';
import GameRules from '../src/components/game/GameRules.vue';
import PlayerPanel from '../src/components/game/PlayerPanel.vue';
import ResultPanel from '../src/components/game/ResultPanel.vue';

let wrapper: VueWrapper | undefined;
beforeEach(() => {
  localStorage.removeItem(SETUP_SETTINGS_KEY);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.unstubAllGlobals(); });

function setup(): VueWrapper {
  wrapper = mount(SetupPanel, { props: { connected: true, busy: false, error: '' } });
  return wrapper;
}
function details(settings: Partial<GameSettings> = {}): VueWrapper {
  wrapper = mount(GameSetupForm, { props: { settings: { ...DEFAULT_SETTINGS, ...settings }, connected: true, busy: false, error: '' } });
  return wrapper;
}
function field(panel: VueWrapper, label: string): DOMWrapper<HTMLSelectElement> {
  const row = panel.findAll('label').find(candidate => candidate.get('span').text() === label);
  if (!row) throw new Error(`Missing setting: ${label}`);
  return row.get<HTMLSelectElement>('select');
}

describe('four-game setup', () => {
  it('starts each selected game while preserving character, difficulty and clock settings', async () => {
    localStorage.setItem(SETUP_SETTINGS_KEY, JSON.stringify({ settings: { ...DEFAULT_SETTINGS, aiDifficulty: 5, seconds: 60 } }));
    const panel = setup();
    const games: GameType[] = ['reversi', 'gomoku', 'chess', 'janggi'];
    const names = ['리버시', '오목', '체스', '장기'];
    const firstSides = ['흑돌이', '흑돌이', '백이', '초가'];
    expect(panel.findAll('.game-option')).toHaveLength(4);
    await panel.findAll('.character-option')[1].trigger('click');
    for (const [index, gameType] of games.entries()) {
      await panel.findAll('.game-option')[index].trigger('click');
      expect(panel.emitted('gameType')?.at(-1)).toEqual([gameType]);
      expect(panel.findAll('.game-option')[index].attributes('aria-pressed')).toBe('true');
      expect(panel.get('.illustration').attributes('aria-label')).toContain(names[index]);
      expect(panel.get('.field-heading').text()).toContain(`${firstSides[index]} 먼저 시작해요`);
      expect(panel.get('.club-stamp').text()).toContain(gameType.toUpperCase());
      expect(panel.find('select').exists()).toBe(false);
      await panel.get('.start-button').trigger('click');
      expect(panel.emitted('start')?.at(-1)?.[0]).toMatchObject({ gameType, blackCharacter: 'jannabi', aiDifficulty: 5, seconds: 60 });
    }
  });

  it('passes remembered formations to the online preparation step and keeps the selected game type', async () => {
    localStorage.setItem(SETUP_SETTINGS_KEY, JSON.stringify({ settings: { ...DEFAULT_SETTINGS, janggiBlackFormation: 'right', janggiWhiteFormation: 'left' } }));
    const panel = setup();
    await panel.findAll('.game-option')[3].trigger('click');
    await panel.findAll('.mode-tabs button')[2].trigger('click');
    await panel.get('.start-button').trigger('click');
    expect(panel.emitted('online')).toEqual([[]]);
    expect(panel.emitted('create')?.at(-1)?.[0]).toMatchObject({ gameType: 'janggi', mode: 'online', janggiBlackFormation: 'right', janggiWhiteFormation: 'left' });
    await panel.findAll('.game-option')[2].trigger('click');
    await panel.get('.start-button').trigger('click');
    expect(panel.emitted('create')?.at(-1)?.[0]).toMatchObject({ gameType: 'chess', mode: 'online' });
  });
});

describe('game-screen settings form', () => {
  it('updates each formation thumbnail to match the starting pieces from that player’s perspective', async () => {
    const form = details({ gameType: 'janggi', mode: 'local' });
    const formations: JanggiFormation[] = ['outer', 'inner', 'left', 'right'];
    const positions: Record<Color, number[]> = { black: [82, 83, 87, 88], white: [7, 6, 2, 1] };
    for (const formation of formations) {
      await field(form, '초 포진').setValue(formation);
      await field(form, '한 포진').setValue(formation);
      await form.get('form').trigger('submit');
      const settings = form.emitted('confirm')!.at(-1)![0] as GameSettings;
      const board = initialState('formation-preview', 'janggi', settings);
      for (const color of ['black', 'white'] as const) {
        const preview = form.findAllComponents(JanggiFormationPreview).find(component => component.props('color') === color)!;
        expect(preview.props('formation')).toBe(formation);
        expect(preview.findAllComponents(PieceArt).map(piece => piece.props('piece')))
          .toEqual(positions[color].map(index => board.pieces![index]));
      }
    }
  });

  it('saves both Janggi formations and restores them through the next basic setup', async () => {
    let form = details({ gameType: 'janggi', mode: 'local' });
    expect(field(form, '초 포진').findAll('option')).toHaveLength(4);
    expect(field(form, '한 포진').findAll('option')).toHaveLength(4);
    await field(form, '초 포진').setValue('left');
    await field(form, '한 포진').setValue('inner');
    await form.get('form').trigger('submit');
    expect(form.emitted('confirm')?.[0]?.[0]).toMatchObject({ gameType: 'janggi', mode: 'local', janggiBlackFormation: 'left', janggiWhiteFormation: 'inner' });
    form.unmount();

    const panel = setup();
    expect(panel.emitted('gameType')).toEqual([['janggi']]);
    expect(panel.find('select').exists()).toBe(false);
    await panel.get('.start-button').trigger('click');
    const settings = panel.emitted('start')![0][0] as GameSettings;
    panel.unmount();
    form = details(settings);
    expect(field(form, '초 포진').element.value).toBe('left');
    expect(field(form, '한 포진').element.value).toBe('inner');
  });

  it.each<{ mode: Mode; labels: string[] }>([
    { mode: 'ai', labels: ['AI 난이도', '한 수 제한 시간'] },
    { mode: 'local', labels: ['한 수 제한 시간', '무르기 기회'] },
    { mode: 'online', labels: ['한 수 제한 시간'] },
  ])('shows only the relevant detailed settings in $mode', async ({ mode, labels }) => {
    const form = details({ gameType: 'chess', mode, blackCharacter: 'jannabi' });
    expect(form.findAll('label > span').map(label => label.text())).toEqual(labels);
    await field(form, '한 수 제한 시간').setValue('60');
    if (mode === 'ai') await field(form, 'AI 난이도').setValue('5');
    if (mode === 'local') await field(form, '무르기 기회').setValue('-1');
    await form.get('form').trigger('submit');
    expect(form.emitted('confirm')?.[0]?.[0]).toMatchObject({ gameType: 'chess', mode, blackCharacter: 'jannabi', seconds: 60 });
    if (mode === 'ai') expect(form.emitted('confirm')?.[0]?.[0]).toMatchObject({ aiDifficulty: 5 });
    if (mode === 'local') expect(form.emitted('confirm')?.[0]?.[0]).toMatchObject({ undoLimit: -1 });
  });

  it('blocks duplicate or disconnected online confirmation and explains a failed creation', async () => {
    const form = details({ mode: 'online' });
    await form.setProps({ connected: false });
    expect(form.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    expect(form.get('[role="status"]').text()).toContain('서버에 연결 중');
    await form.get('form').trigger('submit');
    expect(form.emitted('confirm')).toBeUndefined();
    await form.setProps({ connected: true, busy: true });
    expect(form.get('fieldset').attributes('disabled')).toBeDefined();
    await form.get('form').trigger('submit');
    expect(form.emitted('confirm')).toBeUndefined();
    await form.setProps({ busy: false, error: '방을 만들 수 없어요' });
    expect(form.get('[role="alert"]').text()).toBe('방을 만들 수 없어요');
    await form.get('form').trigger('submit');
    expect(form.emitted('confirm')).toHaveLength(1);
    await form.get('button[type="button"]').trigger('click');
    expect(form.emitted('cancel')).toEqual([[]]);
  });
});

describe('piece-game help tabs', () => {
  it('opens the current game and allows keyboard switching through all four rules', async () => {
    wrapper = mount(GameRules, { props: { gameType: 'chess' }, attachTo: document.body });
    const tabs = wrapper.findAll('[role="tab"]');
    const active = (): string => wrapper!.get('[role="tab"][aria-selected="true"]').text();
    expect(active()).toBe('체스');
    expect(wrapper.text()).toContain('캐슬링과 앙파상');
    expect(wrapper.text()).toContain('퀸·룩·비숍·나이트');
    expect(wrapper.text()).toContain('스테일메이트');
    expect(wrapper.text()).toContain('기물 수로 승패를 결정하지 않아요');
    await tabs[2].trigger('keydown', { key: 'ArrowRight' });
    expect(active()).toBe('장기');
    expect(document.activeElement).toBe(tabs[3].element);
    expect(wrapper.text()).toContain('초(파랑)가 먼저');
    expect(wrapper.text()).toContain('포를 넘거나 상대 포를 잡을 수 없어요');
    expect(wrapper.text()).toContain('빅장 수락');
    expect(wrapper.text()).toContain('친선 규칙');
    expect(wrapper.text()).not.toContain('앙파상');
    await tabs[3].trigger('keydown', { key: 'ArrowRight' });
    expect(active()).toBe('리버시');
    await tabs[0].trigger('keydown', { key: 'ArrowRight' });
    expect(active()).toBe('오목');
    await tabs[1].trigger('keydown', { key: 'End' });
    expect(active()).toBe('장기');
    await tabs[3].trigger('keydown', { key: 'Home' });
    expect(active()).toBe('리버시');
    expect(wrapper.props('gameType')).toBe('chess');
    await wrapper.setProps({ gameType: 'janggi' });
    expect(active()).toBe('장기');
  });
});

describe('piece-game player identity', () => {
  const cases: { gameType: GameType; color: Color; side: string; marker: string }[] = [
    { gameType: 'chess', color: 'black', side: '백', marker: 'white' },
    { gameType: 'chess', color: 'white', side: '흑', marker: 'black' },
    { gameType: 'janggi', color: 'black', side: '초', marker: 'cho' },
    { gameType: 'janggi', color: 'white', side: '한', marker: 'han' },
  ];
  it.each(cases)('shows $gameType $color as $side in the profile and turn indicator', ({ gameType, color, side, marker }) => {
    wrapper = mount(PlayerPanel, { props: { gameType, character: 'grasshopper', color, count: 16, active: true, mood: 'idle', remaining: 30000, seconds: 30, undoCount: 3 } });
    expect(wrapper.get('.color-text').text()).toBe(side);
    expect(wrapper.get('.stone-tag').classes()).toContain(marker);
    expect(wrapper.get('.player-panel').attributes('aria-label')).toBe(`베짱이 ${side}, 16개 기물`);
    expect(wrapper.get('.turn-indicator').attributes('aria-label')).toBe(`베짱이 · ${side}의 차례`);
    expect(wrapper.get('.score').text()).toContain('남은 기물');
    expect(wrapper.text()).not.toContain('개의 돌');
  });
});

describe('piece-game outcomes', () => {
  const outcomes: { gameType: 'chess' | 'janggi'; reason: GameResult['reason']; winner: Color | null; text: string }[] = [
    { gameType: 'chess', reason: 'checkmate', winner: 'black', text: '체크메이트! 킹이 피할 곳이 없어요' },
    { gameType: 'chess', reason: 'stalemate', winner: null, text: '체크가 아니지만 움직일 수 없어 무승부예요' },
    { gameType: 'chess', reason: 'repetition', winner: null, text: '같은 국면이 세 번 나타나 무승부예요' },
    { gameType: 'chess', reason: 'fiftyMoves', winner: null, text: '양쪽이 50수씩 폰 이동·잡기 없이 두어 무승부예요' },
    { gameType: 'chess', reason: 'insufficientMaterial', winner: null, text: '체크메이트에 필요한 기물이 부족해요' },
    { gameType: 'janggi', reason: 'checkmate', winner: 'white', text: '외통장군! 궁을 지킬 수 없어요' },
    { gameType: 'janggi', reason: 'bikjang', winner: null, text: '빅장을 받아들여 무승부예요' },
    { gameType: 'janggi', reason: 'mutualPass', winner: null, text: '양쪽이 연속으로 한 수 쉬어 무승부예요' },
  ];
  it.each(outcomes)('explains $gameType $reason without a misleading stone-score result', ({ gameType, reason, winner, text }) => {
    const game = initialState('piece-result', gameType);
    game.result = { winner, reason };
    wrapper = mount(ResultPanel, { props: { game, blackCharacter: 'grasshopper', canUndo: false, online: false, requested: false, busy: false } });
    expect(wrapper.get('.result-reason').text()).toBe(text);
    expect(wrapper.get('h2').text()).toBe(winner === null ? '사이좋게 무승부!' : `${winner === 'black' ? '베짱이' : '잔나비'}의 승리!`);
    expect(wrapper.get('.result-reason').text()).not.toMatch(/흑 \d+ : 백 \d+/);
  });
});
