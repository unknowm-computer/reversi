// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import { initialState, applyMove, legalMoves } from '../shared/game/engine';
import { chooseDifficultyMove } from '../shared/game/ai';
import { turns } from '../shared/games/checkers/rules';
import { useCharacterReaction } from '../src/composables/useCharacterReaction';
import { impactKind } from '../src/composables/useMoveImpact';
import MoveImpact from '../src/components/game/MoveImpact.vue';
import PieceBoard from '../src/components/game/PieceBoard.vue';

function position(black: number[], white: number[]) {
  const state = initialState('checkers-test', 'checkers');
  state.pieces = state.pieces!.map((_, i) => black.includes(i) ? { color: 'black', kind: 'pawn' }
    : white.includes(i) ? { color: 'white', kind: 'pawn' } : null);
  state.board = state.pieces.map(piece => piece?.color ?? null);
  return state;
}

it('starts with twelve men per side and seven legal opening turns', () => {
  const state = initialState('opening', 'checkers');
  expect(state.board.filter(p => p === 'black')).toHaveLength(12);
  expect(state.board.filter(p => p === 'white')).toHaveLength(12);
  expect(legalMoves(state)).toHaveLength(7);
  expect(legalMoves(state)).toContain(chooseDifficultyMove(state, 5));
});

it('requires capture, previews the first jump and commits the chosen branch as one turn', async () => {
  const state = position([49, 55], [42, 26, 28]);
  const routes = turns(state.pieces!, 'black').map(move => move.path);
  expect(routes).toEqual([[49, 35, 17], [49, 35, 21]]);
  const board = mount(PieceBoard, { props: { state, legal: legalMoves(state), interactive: true, hintIndex: null } });
  try {
    const cell = (i: number) => board.get(`[data-cell="${i}"]`);
    await cell(49).trigger('click');
    await cell(35).trigger('click');
    expect(board.emitted('move')).toBeUndefined();
    expect(cell(42).find('.piece-holder').exists()).toBe(false);
    expect(cell(21).classes()).toContain('destination');
    await cell(21).trigger('click');
    expect(board.emitted('move')).toEqual([[1]]);
    const next = applyMove(state, 1)!;
    expect(next.revision).toBe(1);
    expect(next.turn).toBe('white');
    expect(next.board.filter(p => p === 'white')).toHaveLength(1);
  } finally { board.unmount(); }
});

it('ends a capture on crowning even when the new king could jump backwards', () => {
  const state = position([17], [10, 12]);
  expect(turns(state.pieces!, 'black').map(m => m.path)).toEqual([[17, 3]]);
  const next = applyMove(state, 0)!;
  expect(next.pieces![3]?.kind).toBe('king');
  expect(next.board[12]).toBe('white');
  expect(turns(next.pieces!, 'black').map(m => m.path)).toEqual([[3, 21]]);
});

it('wins when the opponent has no pieces or cannot move', () => {
  expect(applyMove(position([17], [10]), 0)?.result?.winner).toBe('black');
  expect(applyMove(position([17], [56]), 0)?.result?.winner).toBe('black');
});

it('uses the capturing character’s laugh or whistle for a single jump', () => {
  const before = position([49], [42, 12]);
  const next = applyMove(before, 0)!;
  const reaction = useCharacterReaction();
  for (const character of ['jannabi', 'grasshopper'] as const) {
    reaction.transition(before, next, character);
    expect(reaction.reactions.value.black).toBe(character === 'jannabi' ? 'sly' : 'whistle');
    expect(reaction.reactions.value.white).toBe('annoyed');
    expect(reaction.event.value).toBe(character === 'jannabi' ? 'laugh' : 'whistle');
  }
  expect(impactKind(before, next)).toBeNull();
});

it('celebrates a multi-jump when the complete turn is committed', () => {
  const before = position([49], [42, 26, 28]);
  const next = applyMove(before, 0)!;
  const reaction = useCharacterReaction();
  reaction.transition(before, next, 'grasshopper');
  expect(reaction.reactions.value).toEqual({ black: 'happy', white: 'sad' });
  expect(reaction.message.value).toContain('2개');
});

it('taunts on a new crown with or without a capture, and prioritizes victory on the final capture', () => {
  for (const before of [position([8], [23]), position([17], [10, 12])]) {
    const next = applyMove(before, 0)!;
    expect(impactKind(before, next)).toBe('crown');
    expect(impactKind(next, next)).toBeNull();
  }
  const king = position([35], [1]);
  king.pieces![35]!.kind = 'king';
  expect(impactKind(king, applyMove(king, 0)!)).toBeNull();
  const final = position([17], [10]);
  expect(impactKind(final, applyMove(final, 0)!)).toBeNull();
  const scene = mount(MoveImpact, { props: { kind: 'crown', actor: 'grasshopper', count: 0 } });
  expect(scene.text()).toContain('킹 승격!');
  expect(scene.find('.grasshopper.taunt').exists()).toBe(true);
  scene.unmount();
});
