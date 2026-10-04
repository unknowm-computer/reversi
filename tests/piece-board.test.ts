// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { GameState, GameType, Piece } from '../shared/game/types';
import { encodePieceMove, JANGGI_PASS, PROMOTIONS } from '../shared/game/pieces';
import { applyMove, initialState } from '../shared/game/engine';
import PieceBoard from '../src/components/game/PieceBoard.vue';
import PieceMatchSidebar from '../src/components/game/PieceMatchSidebar.vue';

let wrapper: VueWrapper | undefined;
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

function position(gameType: GameType = 'chess'): GameState {
  const pieces = Array<Piece | null>(gameType === 'janggi' ? 90 : 64).fill(null);
  if (gameType === 'chess') {
    pieces[60] = { color: 'black', kind: 'king' };
    pieces[52] = { color: 'black', kind: 'pawn' };
    pieces[4] = { color: 'white', kind: 'king' };
  } else {
    pieces[76] = { color: 'black', kind: 'general' };
    pieces[13] = { color: 'white', kind: 'general' };
  }
  return {
    gameType, gameId: 'piece-ui', revision: 0, board: pieces.map(piece => piece?.color ?? null), pieces,
    turn: 'black', lastFrom: null, lastMove: null, winningLine: [], flipped: [], passed: null, result: null, check: null,
    ...(gameType === 'janggi' ? { janggi: { positionHistory: ['start'], consecutivePasses: 0, bikjang: null } } : { chess: { fen: '', positionHistory: ['start'] } }),
  };
}

describe('piece selection and movement', () => {
  it('grays out the opponent and immovable friendly pieces while keeping legal sources in color', async () => {
    const state = position(), move = encodePieceMove(52, 43);
    state.pieces![43] = { color: 'white', kind: 'bishop' };
    wrapper = mount(PieceBoard, { props: { state, legal: [move], interactive: true, hintIndex: null } });
    const source = wrapper.get('[data-cell="52"]'), target = wrapper.get('[data-cell="43"] .piece-holder');
    expect(source.classes()).toContain('playable');
    expect(source.get('.piece-holder').classes()).not.toContain('subdued');
    expect(wrapper.get('[data-cell="60"] .piece-holder').classes()).toContain('subdued');
    expect(target.classes()).toContain('subdued');
    await source.trigger('click');
    expect(source.get('.piece-holder').classes()).not.toContain('subdued');
    expect(target.classes()).toContain('subdued');
    expect(wrapper.get('[data-cell="43"] .destination-marker').classes()).toContain('capture');
    await source.trigger('keydown', { key: 'Escape' });
    expect(target.classes()).toContain('subdued');
    await wrapper.setProps({ interactive: false });
    expect(wrapper.findAll('.subdued')).toHaveLength(0);
    await wrapper.setProps({ interactive: true, state: { ...state, turn: 'white' }, legal: [encodePieceMove(43, 52)], perspective: 'white' });
    expect(target.classes()).not.toContain('subdued');
    expect(source.get('.piece-holder').classes()).toContain('subdued');
  });

  it('preserves hint, last-move, and check markers without restoring color to an unmovable piece', async () => {
    const state = position(), move = encodePieceMove(52, 43);
    state.pieces![43] = { color: 'white', kind: 'bishop' };
    state.lastMove = 43;
    state.check = 'black';
    wrapper = mount(PieceBoard, { props: { state, legal: [move], interactive: true, hintIndex: null } });
    expect(wrapper.get('[data-cell="43"] .piece-holder').classes()).toContain('subdued');
    expect(wrapper.get('[data-cell="43"]').classes()).toContain('last-to');
    expect(wrapper.get('[data-cell="60"] .check-badge').text()).toBe('체크');
    expect(wrapper.get('[data-cell="60"]').classes()).toContain('checked');
    expect(wrapper.get('[data-cell="60"] .piece-holder').classes()).toContain('subdued');
    await wrapper.setProps({ state: { ...state, lastMove: null }, hintIndex: move });
    expect(wrapper.get('[data-cell="43"] .piece-holder').classes()).toContain('subdued');
    expect(wrapper.get('[data-cell="43"] .hint-marker').exists()).toBe(true);
    expect(wrapper.get('[data-cell="52"] .piece-holder').classes()).not.toContain('subdued');
    await wrapper.setProps({ hintIndex: null });
    expect(wrapper.get('[data-cell="43"] .piece-holder').classes()).toContain('subdued');
    await wrapper.setProps({ state: { ...state, result: { winner: 'white', reason: 'checkmate' } } });
    expect(wrapper.findAll('.subdued')).toHaveLength(0);
  });

  it('uses the same grayscale distinction for Janggi pieces and retains a general’s warning', async () => {
    const state = position('janggi');
    state.pieces![54] = { color: 'black', kind: 'soldier' };
    state.check = 'black';
    wrapper = mount(PieceBoard, { props: { state, legal: [encodePieceMove(54, 45)], interactive: true, hintIndex: null } });
    expect(wrapper.get('[data-cell="54"] .piece-holder').classes()).not.toContain('subdued');
    expect(wrapper.get('[data-cell="76"] .piece-holder').classes()).toContain('subdued');
    expect(wrapper.get('[data-cell="13"] .piece-holder').classes()).toContain('subdued');
    expect(wrapper.get('[data-cell="76"] .check-badge').text()).toBe('장군');
    await wrapper.setProps({ legal: [JANGGI_PASS] });
    expect(wrapper.findAll('.piece-cell.playable')).toHaveLength(0);
    expect(wrapper.findAll('.piece-holder.subdued')).toHaveLength(3);
    await wrapper.setProps({ interactive: false });
    expect(wrapper.findAll('.piece-holder.subdued')).toHaveLength(0);
  });

  it('selects only movable pieces and emits the encoded legal destination once', async () => {
    const move = encodePieceMove(52, 36);
    wrapper = mount(PieceBoard, { props: { state: position(), legal: [move], interactive: true, hintIndex: null } });
    expect(wrapper.findAll('[data-cell]')).toHaveLength(64);
    expect(wrapper.get('[data-cell="52"]').attributes('aria-label')).toContain('E2, 백 폰, 선택 가능');
    await wrapper.get('[data-cell="4"]').trigger('click');
    expect(wrapper.find('[aria-pressed="true"]').exists()).toBe(false);
    await wrapper.get('[data-cell="52"]').trigger('click');
    expect(wrapper.get('[data-cell="52"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-cell="36"]').attributes('aria-label')).toContain('이동 가능');
    await wrapper.get('[data-cell="36"]').trigger('click');
    expect(wrapper.emitted('move')).toEqual([[move]]);
    expect(wrapper.find('[aria-pressed="true"]').exists()).toBe(false);
    await wrapper.get('[data-cell="36"]').trigger('click');
    expect(wrapper.emitted('move')).toHaveLength(1);
  });

  it('cancels selection on Escape, a hint change, a revision, and loss of interaction', async () => {
    const state = position(), move = encodePieceMove(52, 36);
    wrapper = mount(PieceBoard, { props: { state, legal: [move], interactive: true, hintIndex: null } });
    const source = wrapper.get('[data-cell="52"]');
    await source.trigger('click');
    await source.trigger('keydown', { key: 'Escape' });
    expect(source.attributes('aria-pressed')).toBe('false');
    await source.trigger('click');
    await wrapper.setProps({ hintIndex: move });
    expect(source.attributes('aria-pressed')).toBe('false');
    expect(wrapper.get('[data-cell="52"]').classes()).toContain('hint-from');
    expect(wrapper.get('[data-cell="36"]').classes()).toContain('hint-to');
    await source.trigger('click');
    await wrapper.setProps({ state: { ...state, revision: 1 } });
    expect(source.attributes('aria-pressed')).toBe('false');
    await source.trigger('click');
    await wrapper.setProps({ interactive: false });
    await wrapper.get('[data-cell="36"]').trigger('click');
    expect(source.attributes('aria-pressed')).toBe('false');
    expect(wrapper.emitted('move')).toBeUndefined();
  });

  it('renders the second player perspective and maps keyboard arrows to screen directions', async () => {
    wrapper = mount(PieceBoard, { props: { state: position(), legal: [], interactive: false, hintIndex: null, perspective: 'white' }, attachTo: document.body });
    expect(wrapper.findAll('[data-cell]')[0].attributes('data-cell')).toBe('63');
    expect(wrapper.get('.coordinates.top').text()).toBe('HGFEDCBA');
    await wrapper.get('[data-cell="63"]').trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement?.getAttribute('data-cell')).toBe('62');
    await wrapper.get('[data-cell="62"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement?.getAttribute('data-cell')).toBe('54');
    await wrapper.get('[data-cell="54"]').trigger('keydown', { key: 'Home' });
    expect(document.activeElement?.getAttribute('data-cell')).toBe('55');
    await wrapper.get('[data-cell="55"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement?.getAttribute('data-cell')).toBe('48');
  });

  it('marks the checked king, last move, and captures without allowing play after a result', async () => {
    const state = position();
    state.check = 'black'; state.lastFrom = 12; state.lastMove = 36;
    state.pieces![36] = { color: 'white', kind: 'bishop' };
    wrapper = mount(PieceBoard, { props: { state, legal: [encodePieceMove(52, 36)], interactive: true, hintIndex: null } });
    expect(wrapper.get('[data-cell="60"]').attributes('aria-label')).toContain('체크');
    expect(wrapper.get('[data-cell="12"]').classes()).toContain('last-from');
    await wrapper.get('[data-cell="52"]').trigger('click');
    expect(wrapper.get('[data-cell="36"] .destination-marker').classes()).toContain('capture');
    await wrapper.setProps({ state: { ...state, result: { winner: 'white', reason: 'checkmate' } } });
    await wrapper.get('[data-cell="36"]').trigger('click');
    expect(wrapper.emitted('move')).toBeUndefined();
  });
});

describe('piece move feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  });
  function move(state: GameState, from: number, to: number): GameState {
    const next = applyMove(state, encodePieceMove(from, to));
    expect(next).not.toBeNull();
    return next!;
  }
  function beforeCapture(): GameState {
    return move(move(initialState('feedback', 'chess'), 52, 36), 11, 27);
  }
  function render(state: GameState): void {
    wrapper = mount(PieceBoard, { props: { state, legal: [], interactive: false, hintIndex: null } });
  }

  it('celebrates a capture once, with no replay for duplicate snapshots, undo, or another game', async () => {
    const before = beforeCapture(), captured = move(before, 36, 27);
    render(before);
    await wrapper!.setProps({ state: captured });
    expect(wrapper!.get('[data-cell="27"]').classes()).toContain('capture-arrival');
    expect(wrapper!.find('.capture-burst').exists()).toBe(true);
    await vi.advanceTimersByTimeAsync(500);
    await wrapper!.setProps({ state: structuredClone(captured) });
    await vi.advanceTimersByTimeAsync(230);
    expect(wrapper!.find('.capture-burst').exists()).toBe(false);
    await wrapper!.setProps({ state: { ...before, revision: captured.revision + 1 } });
    expect(wrapper!.find('.capture-burst').exists()).toBe(false);
    await wrapper!.setProps({ state: { ...captured, gameId: 'another-game', revision: captured.revision + 2 } });
    expect(wrapper!.find('.capture-burst').exists()).toBe(false);
  });

  it('ignores skipped revisions and rewritten move history instead of celebrating reconnect state', async () => {
    const before = beforeCapture(), captured = move(before, 36, 27);
    render(before);
    await wrapper!.setProps({ state: { ...captured, revision: captured.revision + 1 } });
    expect(wrapper!.find('.capture-burst').exists()).toBe(false);
    await wrapper!.setProps({ state: before });
    await wrapper!.setProps({ state: { ...captured, chess: { ...captured.chess!, positionHistory: captured.chess!.positionHistory.map((position, index) => index === 0 ? 'other-history' : position) } } });
    expect(wrapper!.find('.capture-burst').exists()).toBe(false);
  });

  it('detects an en passant capture even though its destination was empty', async () => {
    let state = move(initialState('en-passant', 'chess'), 52, 36);
    state = move(state, 8, 16);
    state = move(state, 36, 28);
    state = move(state, 11, 27);
    render(state);
    expect(state.pieces![19]).toBeNull();
    await wrapper!.setProps({ state: move(state, 28, 19) });
    expect(wrapper!.get('[data-cell="19"]').classes()).toContain('capture-arrival');
  });

  it('pulses a newly checked king once and keeps its badge after the motion ends', async () => {
    let state = move(initialState('check', 'chess'), 52, 36);
    state = move(state, 13, 29);
    render(state);
    const checked = move(state, 59, 31);
    expect(checked.check).toBe('white');
    await wrapper!.setProps({ state: checked });
    expect(wrapper!.get('[data-cell="4"]').classes()).toContain('check-arrival');
    expect(wrapper!.get('[data-cell="4"] .check-badge').text()).toBe('체크');
    await vi.advanceTimersByTimeAsync(720);
    expect(wrapper!.get('[data-cell="4"]').classes()).not.toContain('check-arrival');
    expect(wrapper!.get('[data-cell="4"] .check-badge').text()).toBe('체크');
    await wrapper!.setProps({ state: structuredClone(checked) });
    expect(wrapper!.get('[data-cell="4"]').classes()).not.toContain('check-arrival');
  });

  it('marks a Janggi capture and janggun, then removes the warning when the general escapes', async () => {
    const state = position('janggi');
    state.pieces![76] = null;
    state.pieces![75] = { color: 'black', kind: 'general' };
    state.pieces![49] = { color: 'black', kind: 'rook' };
    state.pieces![31] = { color: 'white', kind: 'soldier' };
    state.board = state.pieces!.map(piece => piece?.color ?? null);
    render(state);
    const checked = move(state, 49, 31);
    expect(checked.check).toBe('white');
    await wrapper!.setProps({ state: checked });
    expect(wrapper!.get('[data-cell="31"]').classes()).toContain('capture-arrival');
    expect(wrapper!.get('[data-cell="13"]').classes()).toContain('check-arrival');
    expect(wrapper!.get('[data-cell="13"] .check-badge').text()).toBe('장군');
    await wrapper!.setProps({ state: move(checked, 13, 14) });
    expect(wrapper!.find('.check-badge').exists()).toBe(false);
    expect(wrapper!.find('.capture-burst').exists()).toBe(false);
  });

  it('does not replay feedback on initial render or while the page is hidden and clears its timer on unmount', async () => {
    const before = beforeCapture(), captured = move(before, 36, 27);
    render(captured);
    expect(wrapper!.find('.capture-burst').exists()).toBe(false);
    await wrapper!.setProps({ state: before });
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await wrapper!.setProps({ state: captured });
    expect(wrapper!.find('.capture-burst').exists()).toBe(false);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    await wrapper!.setProps({ state: before });
    await wrapper!.setProps({ state: captured });
    expect(vi.getTimerCount()).toBe(1);
    wrapper!.unmount(); wrapper = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('promotion choices', () => {
  function promotionPosition(): GameState {
    const state = position();
    state.pieces![8] = { color: 'black', kind: 'pawn' };
    return state;
  }
  it('asks for the promotion piece before emitting and preserves a chosen underpromotion', async () => {
    const legal = PROMOTIONS.map(kind => encodePieceMove(8, 0, kind));
    wrapper = mount(PieceBoard, { props: { state: promotionPosition(), legal, interactive: true, hintIndex: null }, attachTo: document.body });
    await wrapper.get('[data-cell="8"]').trigger('click');
    await wrapper.get('[data-cell="0"]').trigger('click');
    expect(wrapper.emitted('move')).toBeUndefined();
    expect(wrapper.findAll('[data-promotion]')).toHaveLength(4);
    expect(document.activeElement?.getAttribute('data-promotion')).toBe('queen');
    await wrapper.get('[data-promotion="queen"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement?.getAttribute('data-promotion')).toBe('knight');
    await wrapper.get('[data-promotion="knight"]').trigger('click');
    expect(wrapper.emitted('move')).toEqual([[encodePieceMove(8, 0, 'knight')]]);
    expect(wrapper.find('.promotion-panel').exists()).toBe(false);
  });

  it('allows cancelling promotion and rejects a stale choice after the turn is locked', async () => {
    const legal = PROMOTIONS.map(kind => encodePieceMove(8, 0, kind));
    wrapper = mount(PieceBoard, { props: { state: promotionPosition(), legal, interactive: true, hintIndex: null } });
    await wrapper.get('[data-cell="8"]').trigger('click');
    await wrapper.get('[data-cell="0"]').trigger('click');
    await wrapper.get('[data-promotion="queen"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('.promotion-panel').exists()).toBe(false);
    expect(wrapper.emitted('move')).toBeUndefined();
    await wrapper.get('[data-cell="0"]').trigger('click');
    const oldChoice = wrapper.get('[data-promotion="queen"]');
    await wrapper.setProps({ interactive: false });
    await oldChoice.trigger('click');
    expect(wrapper.emitted('move')).toBeUndefined();
  });
});

describe('Janggi board and status', () => {
  it('announces Janggi chariots and soldiers with their own side-specific names', () => {
    const state = position('janggi');
    state.pieces![0] = { color: 'white', kind: 'rook' };
    state.pieces![81] = { color: 'black', kind: 'rook' };
    state.pieces![27] = { color: 'white', kind: 'soldier' };
    state.pieces![54] = { color: 'black', kind: 'soldier' };
    wrapper = mount(PieceBoard, { props: { state, legal: [], interactive: false, hintIndex: null } });
    expect(wrapper.get('[data-cell="0"]').attributes('aria-label')).toBe('A10, 한 차');
    expect(wrapper.get('[data-cell="81"]').attributes('aria-label')).toBe('A1, 초 차');
    expect(wrapper.get('[data-cell="27"]').attributes('aria-label')).toBe('A7, 한 병');
    expect(wrapper.get('[data-cell="54"]').attributes('aria-label')).toBe('A4, 초 졸');
  });

  it('renders 90 intersections and palaces, preserving edge lines when reversed', async () => {
    wrapper = mount(PieceBoard, { props: { state: position('janggi'), legal: [], interactive: false, hintIndex: null, perspective: 'white' } });
    expect(wrapper.findAll('[data-cell]')).toHaveLength(90);
    expect(wrapper.find('.palaces path').exists()).toBe(true);
    expect(wrapper.get('[data-cell="89"]').classes()).toEqual(expect.arrayContaining(['first-row', 'first-column']));
    expect(wrapper.get('[data-cell="76"]').attributes('aria-label')).toContain('초 궁');
    expect(wrapper.get('[data-cell="13"]').attributes('aria-label')).toContain('한 궁');
    expect(wrapper.findAll('.janggi-piece text').map(node => node.text())).toEqual(['楚', '漢']);
  });

  it('announces a legal pass hint without placing a separate control below the board', async () => {
    const state = position('janggi');
    wrapper = mount(PieceBoard, { props: { state, legal: [JANGGI_PASS], interactive: true, hintIndex: JANGGI_PASS } });
    expect(wrapper.get('[role="status"]').text()).toBe('힌트: 이번 수는 쉬어 보세요.');
    expect(wrapper.findAll('button').some(button => button.text().includes('쉬기'))).toBe(false);
    await wrapper.setProps({ legal: [] });
    expect(wrapper.get('[role="status"]').text()).toBe('');
  });

  it('summarizes remaining pieces and actual move history for each game', async () => {
    const state = position('chess');
    state.chess!.positionHistory.push('move1', 'move2');
    state.check = 'white';
    wrapper = mount(PieceMatchSidebar, { props: { state } });
    expect(wrapper.text()).toContain('백의 차례');
    expect(wrapper.text()).toContain('흑 체크');
    expect(wrapper.text()).toContain('2수');
    expect(wrapper.findAll('.piece-count strong').map(node => node.text())).toEqual(['2개', '1개']);
    await wrapper.setProps({ state: { ...position('janggi'), result: { winner: null, reason: 'mutualPass' } } });
    expect(wrapper.get('h2').text()).toBe('무승부');
    expect(wrapper.text()).toContain('친선 규칙');
    expect(wrapper.text()).toContain('서로 연속해서 한 수씩 쉬면 무승부');
  });
});
