import { describe, expect, it } from 'vitest';
import { initialState, applyMove } from '../shared/game/rules';
import { useCharacterReaction } from '../src/composables/useCharacterReaction';

describe('corner character reactions', () => {
  it('prioritizes impact over corner reactions at five flips and clears a previous celebration', () => {
    for (const actor of ['black', 'white'] as const) {
      for (const count of [4, 5]) {
        const before = initialState('corner'); before.turn = actor;
        for (let i = 1; i <= count; i++) before.board[i] = actor === 'black' ? 'white' : 'black';
        before.board[count + 1] = actor;
        const next = applyMove(before, 0)!;
        expect(next.flipped).toHaveLength(count);
        const reaction = useCharacterReaction();
        reaction.corner.value = { actor, mood: 'sly', until: Infinity };
        reaction.transition(before, next, 'jannabi');
        if (count === 5) {
          expect(reaction.corner.value).toBeNull();
          expect(['laugh', 'whistle']).not.toContain(reaction.event.value);
        } else {
          expect(reaction.corner.value?.actor).toBe(actor);
          expect(['laugh', 'whistle']).toContain(reaction.event.value);
        }
      }
    }
  });

  it('maps the acting color to its character, independent of seat', () => {
    for (const actor of ['black', 'white'] as const) {
      for (const character of ['jannabi', 'grasshopper'] as const) {
        const before = initialState('corner'); before.turn = actor;
        before.board[1] = actor === 'black' ? 'white' : 'black'; before.board[2] = actor;
        const reaction = useCharacterReaction();
        reaction.transition(before, applyMove(before, 0)!, character);
        const monkey = actor === 'black' ? character === 'jannabi' : character !== 'jannabi';
        expect(reaction.corner.value?.actor).toBe(actor);
        expect(reaction.corner.value?.mood).toBe(monkey ? 'sly' : 'whistle');
        expect(reaction.event.value).toBe(monkey ? 'laugh' : 'whistle');
        reaction.reset(); expect(reaction.corner.value).toBeNull();
      }
    }
  });
  it('does not emit corner audio for ordinary moves or a repeated snapshot', () => {
    const before = initialState('normal'), reaction = useCharacterReaction();
    const next = applyMove(before, 19)!;
    reaction.transition(before, next, 'jannabi'); expect(reaction.corner.value).toBeNull();
    before.board[1] = 'white'; before.board[2] = 'black'; const corner = applyMove(before, 0)!;
    reaction.transition(corner, corner, 'jannabi'); expect(reaction.corner.value).toBeNull();
  });
});
