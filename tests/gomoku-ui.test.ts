// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { DEFAULT_SETTINGS, type Cell, type Color, type GameType } from '../shared/game/types';
import { initialState } from '../shared/game/engine';
import { GOMOKU_CELL_COUNT, GOMOKU_SIZE } from '../shared/games/gomoku/board';
import SetupPanel from '../src/components/game/SetupPanel.vue';
import GameRules from '../src/components/game/GameRules.vue';
import GomokuBoard from '../src/components/game/GomokuBoard.vue';
import GomokuMatchSidebar from '../src/components/game/GomokuMatchSidebar.vue';
import ResultPanel from '../src/components/game/ResultPanel.vue';
import { SETUP_SETTINGS_KEY } from '../src/composables/useSetupSettings';

let wrapper: VueWrapper | undefined;
beforeEach(() => {
  localStorage.removeItem('reversi-settings');
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.unstubAllGlobals(); });

function emptyBoard(): Cell[] { return Array<Cell>(GOMOKU_CELL_COUNT).fill(null); }

describe('game selection and instructions', () => {
  it('announces the initial game, changes game without losing settings, and starts the chosen game', async () => {
    localStorage.setItem(SETUP_SETTINGS_KEY, JSON.stringify({ settings: { ...DEFAULT_SETTINGS, aiDifficulty: 5 } }));
    wrapper = mount(SetupPanel, { props: { connected: true, busy: false, error: '' } });
    expect(wrapper.emitted('gameType')).toEqual([['reversi']]);
    expect(wrapper.find('select').exists()).toBe(false);
    await wrapper.findAll('.character-option')[1].trigger('click');
    await wrapper.findAll('.game-option')[1].trigger('click');
    expect(wrapper.emitted('gameType')?.at(-1)).toEqual(['gomoku']);
    expect(wrapper.get('.illustration').attributes('aria-label')).toContain('오목');
    expect(wrapper.get('.club-stamp').text()).toContain('GOMOKU');
    expect(wrapper.get('.welcome-foot').text()).not.toContain('64');
    expect(wrapper.findAll('.game-option')[1].attributes('aria-pressed')).toBe('true');
    await wrapper.get('.start-button').trigger('click');
    expect(wrapper.emitted('start')?.[0]?.[0]).toMatchObject({ gameType: 'gomoku', mode: 'ai', aiDifficulty: 5, blackCharacter: 'jannabi' });
    await wrapper.findAll('.game-option')[0].trigger('click');
    expect(wrapper.get('.club-stamp').text()).toContain('REVERSI');
    await wrapper.get('.start-button').trigger('click');
    expect(wrapper.emitted('start')?.at(-1)?.[0]).toMatchObject({ gameType: 'reversi', aiDifficulty: 5 });
  });

  it('includes Gomoku when creating a room', async () => {
    wrapper = mount(SetupPanel, { props: { connected: true, busy: false, error: '' } });
    await wrapper.findAll('.game-option')[1].trigger('click');
    await wrapper.findAll('.mode-tabs button')[2].trigger('click');
    await wrapper.get('.start-button').trigger('click');
    expect(wrapper.emitted('online')).toHaveLength(1);
    expect(wrapper.emitted('create')?.[0]?.[0]).toMatchObject({ gameType: 'gomoku', mode: 'online' });
  });

  it('switches accessible rule tabs independently of the selected game and keeps shared controls documented', async () => {
    const rules = mount(GameRules, { props: { gameType: 'reversi' }, attachTo: document.body });
    wrapper = rules;
    const tabs = rules.findAll('[role="tab"]');
    expect(tabs.map(tab => tab.text())).toEqual(['리버시', '오목', '체스', '장기']);
    expect(rules.findAll('[role="tabpanel"]')).toHaveLength(1);
    const panelId = rules.get('[role="tabpanel"]').attributes('id');
    expect(panelId).toBeTruthy();
    const expectActiveTab = (index: number): void => {
      tabs.forEach((tab, tabIndex) => {
        expect(tab.attributes('id')).toBeTruthy();
        expect(tab.attributes('aria-selected')).toBe(String(tabIndex === index));
        expect(tab.attributes('tabindex')).toBe(tabIndex === index ? '0' : '-1');
        expect(tab.attributes('aria-controls')).toBe(panelId);
      });
      expect(rules.get('[role="tabpanel"]').attributes('aria-labelledby')).toBe(tabs[index].attributes('id'));
    };
    expectActiveTab(0);
    expect(rules.text()).toContain('상대 돌을 내 돌 사이에');
    expect(rules.text()).not.toContain('금수');
    await tabs[1].trigger('click');
    expectActiveTab(1);
    expect(rules.props('gameType')).toBe('reversi');
    const text = rules.text();
    expect(text).toContain('15×15');
    expect(text).toContain('정확히 다섯 개');
    expect(text).toContain('흑·백 모두 3-3·4-4 금수');
    expect(text).toContain('열린 3을 동시에');
    expect(text).toContain('4를 둘 이상 만들 수 없어요');
    expect(text).toContain('오목을 완성하는 수는 3-3·4-4보다 우선');
    expect(text).toContain('여섯 개 이상은 장목 금수');
    expect(text).toContain('다른 방향에서 오목을 동시에 완성하더라도 장목이면 금수');
    expect(text).toContain('내 차례에 금수로 놓을 곳이 없으면 패배');
    expect(text).toContain('양쪽 모두 금수로 놓을 곳이 없으면 무승부');
    expect(text).toContain('붉은 ×');
    expect(text).not.toContain('장목도 승리');
    expect(text).not.toContain('다섯 개 이상');
    expect(text).toContain('승점이 아니에요');
    expect(text).toContain('횟수 제한 없이');
    expect(text).toContain('6자리 방 코드');
    expect(text).not.toContain('초록 점');
    expect(text).not.toContain('양쪽 모두 놓을 곳이 없으면');
    await tabs[0].trigger('click');
    expectActiveTab(0);
    expect(rules.text()).toContain('상대 돌을 내 돌 사이에');
    expect(rules.text()).not.toContain('금수');

    const keyboardSelections: [string, number][] = [
      ['ArrowLeft', 3], ['ArrowRight', 0], ['End', 3], ['Home', 0],
    ];
    for (const [key, index] of keyboardSelections) {
      await rules.get('[role="tab"][aria-selected="true"]').trigger('keydown', { key });
      expectActiveTab(index);
      expect(document.activeElement).toBe(tabs[index].element);
    }
    expect(rules.props('gameType')).toBe('reversi');
    expect(rules.emitted('gameType')).toBeUndefined();
    expect(rules.emitted('update:gameType')).toBeUndefined();

    await rules.setProps({ gameType: 'gomoku' });
    expectActiveTab(1);
    await tabs[0].trigger('click');
    rules.unmount();
    wrapper = mount(GameRules, { props: { gameType: 'gomoku' } });
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('오목');
    expect(wrapper.get('[role="tabpanel"]').text()).toContain('15×15');
  });
});

describe('no-legal-move results', () => {
  it.each([
    { winner: 'black' as const, heading: '베짱이의 승리!', reason: '백돌이 금수로 놓을 곳이 없어 끝났어요' },
    { winner: 'white' as const, heading: '잔나비의 승리!', reason: '흑돌이 금수로 놓을 곳이 없어 끝났어요' },
    { winner: null, heading: '사이좋게 무승부!', reason: '양쪽 모두 금수로 놓을 곳이 없어 무승부예요' },
  ])('explains the Gomoku result with winner $winner', ({ winner, heading, reason }) => {
    const game = initialState('blocked', 'gomoku');
    game.result = { winner, reason: 'noLegalMoves' };
    wrapper = mount(ResultPanel, { props: { game, blackCharacter: 'grasshopper', canUndo: true, online: false, requested: false, busy: false } });
    expect(wrapper.get('h2').text()).toBe(heading);
    expect(wrapper.get('.result-reason').text()).toContain(reason);
    expect(wrapper.get('.result-reason').text()).not.toContain('모든 수를 마쳤어요');
  });

  it.each<GameType>(['reversi', 'gomoku'])('only describes a large stone advantage as decisive in Reversi ($0)', gameType => {
    const game = initialState('stone-count', gameType);
    game.board = game.board.map((_, index) => index < 30 ? 'black' : null);
    game.result = { winner: 'black', reason: 'noLegalMoves' };
    wrapper = mount(ResultPanel, { props: { game, blackCharacter: 'grasshopper', canUndo: false, online: false, requested: false, busy: false } });
    expect(wrapper.get('h2').text()).toBe(`베짱이의 ${gameType === 'reversi' ? '대승' : '승리'}!`);
    if (gameType === 'reversi') expect(wrapper.get('.result-reason').text()).toBe('모든 수를 마쳤어요 · 흑 30 : 백 0');
  });
});

describe('Gomoku intersections', () => {
  it.each((['black', 'white'] as Color[]).flatMap(turn => [
    { turn, reason: '4-4 금수', stones: [110, 111, 113, 82, 97, 127] },
    { turn, reason: '장목 금수(6목 이상)', stones: [109, 110, 111, 113, 114] },
  ]))('blocks $turn $reason and excludes it from hints', async ({ turn, reason, stones }) => {
    const board = emptyBoard();
    stones.forEach(index => { board[index] = turn; });
    wrapper = mount(GomokuBoard, { props: { board, turn, interactive: true, lastMove: null, winningLine: [], hintIndex: 112 } });
    const forbiddenCell = wrapper.get('[data-cell="112"]');
    expect(forbiddenCell.attributes('aria-label')).toBe(`H8, 빈 교차점, ${reason}, 착수 불가`);
    expect(forbiddenCell.attributes('title')).toBe(reason);
    expect(forbiddenCell.attributes('aria-disabled')).toBe('true');
    expect(forbiddenCell.find('.forbidden-marker').exists()).toBe(true);
    expect(wrapper.find('.suggestion-marker').exists()).toBe(false);
    await forbiddenCell.trigger('click');
    expect(wrapper.emitted('move')).toBeUndefined();
    await wrapper.setProps({ turn: turn === 'black' ? 'white' : 'black' });
    expect(forbiddenCell.attributes('aria-disabled')).toBe('false');
    expect(forbiddenCell.attributes('title')).toBeUndefined();
    expect(forbiddenCell.find('.suggestion-marker').exists()).toBe(true);
  });

  it.each<Color>(['black', 'white'])('marks %s double threes and blocks pointer and keyboard placement', async turn => {
    const board = emptyBoard();
    [97, 111, 113, 127].forEach(index => { board[index] = turn; });
    wrapper = mount(GomokuBoard, { props: { board, turn, interactive: true, lastMove: 127, winningLine: [], hintIndex: 112 } });
    const forbiddenCell = wrapper.get('[data-cell="112"]');
    expect(forbiddenCell.classes()).toContain('forbidden');
    expect(forbiddenCell.classes()).not.toContain('playable');
    expect(forbiddenCell.attributes('aria-label')).toContain('H8, 빈 교차점, 3-3 금수, 착수 불가');
    expect(forbiddenCell.attributes('aria-disabled')).toBe('true');
    expect(forbiddenCell.find('.forbidden-marker').exists()).toBe(true);
    expect(wrapper.find('.suggestion-marker').exists()).toBe(false);
    await forbiddenCell.trigger('click');
    for (const key of ['Enter', ' ']) {
      await forbiddenCell.trigger('keydown', { key });
      // Native buttons dispatch click for keyboard activation; jsdom does not synthesize it.
      forbiddenCell.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    }
    expect(wrapper.emitted('move')).toBeUndefined();
    await wrapper.get('[data-cell="0"]').trigger('click');
    expect(wrapper.emitted('move')).toEqual([[0]]);

    await wrapper.setProps({ interactive: false });
    expect(wrapper.find('.forbidden-marker').exists()).toBe(false);
    await wrapper.setProps({ interactive: true, turn: turn === 'black' ? 'white' : 'black' });
    expect(forbiddenCell.find('.forbidden-marker').exists()).toBe(false);
    expect(forbiddenCell.attributes('aria-disabled')).toBe('false');
    await forbiddenCell.trigger('click');
    expect(wrapper.emitted('move')).toEqual([[0], [112]]);
  });

  it('places only on empty intersections when interactive, including both board corners', async () => {
    const board = emptyBoard(); board[112] = 'black';
    wrapper = mount(GomokuBoard, { props: { board, turn: 'white', interactive: true, lastMove: 112, winningLine: [] } });
    expect(wrapper.findAll('[data-cell]')).toHaveLength(225);
    expect(wrapper.findAll('.hint')).toHaveLength(0);
    expect(wrapper.get('[data-cell="0"]').attributes('aria-label')).toContain('A1, 빈 교차점');
    expect(wrapper.get('[data-cell="224"]').attributes('aria-label')).toContain('O15, 빈 교차점');
    await wrapper.get('[data-cell="0"]').trigger('click');
    await wrapper.get('[data-cell="224"]').trigger('click');
    await wrapper.get('[data-cell="112"]').trigger('click');
    expect(wrapper.emitted('move')).toEqual([[0], [224]]);
    expect(wrapper.get('[data-cell="112"]').attributes('aria-disabled')).toBe('true');
    expect(wrapper.get('[data-cell="112"]').attributes('aria-label')).toContain('마지막 착수');
    await wrapper.setProps({ interactive: false });
    await wrapper.get('[data-cell="1"]').trigger('click');
    expect(wrapper.emitted('move')).toHaveLength(2);
    expect(wrapper.get('[data-cell="1"]').attributes('aria-disabled')).toBe('true');
  });

  it('moves keyboard focus using all 15 intersections and wraps at board edges', async () => {
    wrapper = mount(GomokuBoard, { props: { board: emptyBoard(), turn: 'black', interactive: true, lastMove: null, winningLine: [] }, attachTo: document.body });
    const center = 7 * GOMOKU_SIZE + 7;
    expect(wrapper.get(`[data-cell="${center}"]`).attributes('tabindex')).toBe('0');
    await wrapper.get(`[data-cell="${center}"]`).trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement?.getAttribute('data-cell')).toBe(String(center + GOMOKU_SIZE));
    await wrapper.get('[data-cell="0"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement?.getAttribute('data-cell')).toBe('14');
    await wrapper.get('[data-cell="14"]').trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement?.getAttribute('data-cell')).toBe('224');
    await wrapper.get('[data-cell="224"]').trigger('keydown', { key: 'Home' });
    expect(document.activeElement?.getAttribute('data-cell')).toBe('210');
  });

  it('shows a valid hint and the complete winning line without changing stones', async () => {
    const board = emptyBoard();
    const winningLine = [110, 111, 112, 113, 114];
    winningLine.forEach(index => { board[index] = 'black'; });
    wrapper = mount(GomokuBoard, { props: { board, turn: 'black', interactive: false, lastMove: 114, winningLine, hintIndex: 0 } });
    expect(wrapper.findAll('.winning')).toHaveLength(5);
    expect(wrapper.get('.victory-line polyline').attributes('points')).toBe('5.5,7.5 6.5,7.5 7.5,7.5 8.5,7.5 9.5,7.5');
    expect(wrapper.get('[data-cell="0"]').attributes('aria-label')).toContain('힌트 추천');
    expect(wrapper.findAll('.disc')).toHaveLength(5);
    await wrapper.setProps({ hintIndex: 112 });
    expect(wrapper.find('.suggestion-marker').exists()).toBe(false);
    await wrapper.setProps({ hintIndex: 225 });
    expect(wrapper.find('.suggestion-marker').exists()).toBe(false);
  });

  it('reports turns and moves instead of Reversi piece advantage', async () => {
    wrapper = mount(GomokuMatchSidebar, { props: { moveCount: 9, turn: 'white', result: null } });
    expect(wrapper.text()).toContain('백의 차례');
    expect(wrapper.text()).toContain('9수');
    expect(wrapper.text()).toContain('흑·백 3-3·4-4·장목 금수');
    expect(wrapper.text()).toContain('정확히 다섯 개');
    expect(wrapper.find('.score-bar').exists()).toBe(false);
    await wrapper.setProps({ result: { winner: 'black', reason: 'fiveInRow' } });
    expect(wrapper.text()).toContain('흑의 승리');
  });
});
