import { describe, expect, it, vi } from 'vitest';
import type { Square } from 'chess.js';
import { initialState, applyMove } from '../shared/games/reversi/rules';
import { initialState as initialGomokuState, applyMove as applyGomokuMove } from '../shared/games/gomoku/rules';
import { endGame } from '../shared/game/state';
import { encodePieceMove } from '../shared/game/pieces';
import type { GameState, Piece } from '../shared/game/types';
import { initialState as initialChessState, applyMove as applyChessMove, squareIndex } from '../shared/games/chess/rules';
import { initialState as initialJanggiState, applyMove as applyJanggiMove } from '../shared/games/janggi/rules';
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

function chessSequence(moves: ReadonlyArray<readonly [Square, Square]>): GameState {
  return moves.reduce((state, [from, to]) => applyChessMove(state, encodePieceMove(squareIndex(from), squareIndex(to)))!, initialChessState('reaction'));
}

describe('piece game character reactions', () => {
  it('celebrates captures with the acting character for either player', () => {
    const pairs: [GameState, GameState][] = [];
    const first = chessSequence([['e2', 'e4'], ['d7', 'd5']]);
    pairs.push([first, applyChessMove(first, encodePieceMove(squareIndex('e4'), squareIndex('d5')))!]);
    const second = chessSequence([['e2', 'e4'], ['d7', 'd5'], ['b1', 'c3']]);
    pairs.push([second, applyChessMove(second, encodePieceMove(squareIndex('d5'), squareIndex('e4')))!]);
    for (const [before, next] of pairs) {
      for (const character of ['jannabi', 'grasshopper'] as const) {
        const reaction = useCharacterReaction();
        reaction.transition(before, next, character);
        const monkey = before.turn === 'black' ? character === 'jannabi' : character !== 'jannabi';
        expect(reaction.event.value).toBe(monkey ? 'laugh' : 'whistle');
        expect(reaction.reactions.value[before.turn]).toBe(monkey ? 'sly' : 'whistle');
        expect(reaction.reactions.value[next.turn]).toBe('annoyed');
        expect(reaction.corner.value).toBeNull();
        expect(reaction.message.value).not.toBe('');
      }
    }
  });

  it('recognizes en passant as a capture even though its destination was empty', () => {
    const before = chessSequence([['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5']]);
    const next = applyChessMove(before, encodePieceMove(squareIndex('e5'), squareIndex('d6')))!;
    expect(before.pieces?.[next.lastMove!]).toBeNull();
    const reaction = useCharacterReaction();
    reaction.transition(before, next, 'grasshopper');
    expect(reaction.event.value).toBe('whistle');
  });

  it('celebrates a janggi capture and gives check messages precedence', () => {
    const pieces = Array<Piece | null>(90).fill(null);
    pieces[75] = { color: 'black', kind: 'general' };
    pieces[14] = { color: 'white', kind: 'general' };
    pieces[45] = { color: 'black', kind: 'rook' };
    pieces[50] = { color: 'white', kind: 'horse' };
    const before = { ...initialJanggiState('capture'), pieces, board: pieces.map(piece => piece?.color ?? null) };
    const next = applyJanggiMove(before, encodePieceMove(45, 50))!;
    expect(next.check).toBe('white');
    const reaction = useCharacterReaction();
    reaction.transition(before, next, 'jannabi');
    expect(reaction.event.value).toBe('laugh');
    expect(reaction.reactions.value).toEqual({ black: 'sly', white: 'annoyed' });
    expect(reaction.message.value).toContain('장군!');
  });

  it('keeps quiet moves, snapshots, undo, forgiveness and hidden captures free of celebration', () => {
    const before = chessSequence([['e2', 'e4'], ['d7', 'd5']]);
    const next = applyChessMove(before, encodePieceMove(squareIndex('e4'), squareIndex('d5')))!;
    const quiet = applyChessMove(before, encodePieceMove(squareIndex('b1'), squareIndex('c3')))!;
    const transitions: [GameState, GameState][] = [
      [before, quiet], [next, next], [before, { ...next, gameId: 'new' }],
      [before, { ...next, revision: next.revision + 3 }], [next, { ...before, revision: next.revision + 1 }],
      [next, { ...next, revision: next.revision + 1 }],
    ];
    for (const [previous, current] of transitions) {
      const reaction = useCharacterReaction();
      reaction.transition(previous, current, 'jannabi');
      expect(reaction.event.value).toBe('move');
      expect(reaction.reactions.value).toEqual({ black: 'idle', white: 'idle' });
    }
    vi.stubGlobal('document', { hidden: true });
    try {
      const reaction = useCharacterReaction();
      reaction.transition(before, next, 'jannabi');
      expect(reaction.event.value).toBe('move');
      expect(reaction.message.value).toBe('');
    } finally { vi.unstubAllGlobals(); }
  });
});

describe('gomoku character reactions', () => {
  it('keeps ordinary intersections free of capture or corner celebrations and clears the previous game reaction', () => {
    const before = initialGomokuState('gomoku');
    const reaction = useCharacterReaction();
    reaction.corner.value = { actor: 'black', mood: 'sly', until: Infinity };
    reaction.transition(before, applyGomokuMove(before, 0)!, 'jannabi');
    expect(reaction.corner.value).toBeNull();
    expect(reaction.event.value).toBe('move');
    expect(reaction.message.value).toBe('');
    expect(reaction.reactions.value).toEqual({ black: 'idle', white: 'idle' });
  });

  it('does not interpret reversi-only transition fields as gomoku events', () => {
    const before = initialGomokuState('gomoku');
    const next = { ...applyGomokuMove(before, 0)!, flipped: [1, 2, 3], passed: 'white' as const };
    const reaction = useCharacterReaction();
    reaction.transition(before, next, 'jannabi');
    expect(reaction.corner.value).toBeNull(); expect(reaction.event.value).toBe('move');
    expect(reaction.message.value).toBe('');
  });

  it('celebrates five in a row and retains resignation and timeout results', () => {
    const before = initialGomokuState('gomoku');
    for (const index of [105, 106, 107, 108]) before.board[index] = 'black';
    const victory = applyGomokuMove(before, 109)!;
    expect(victory.result).toEqual({ winner: 'black', reason: 'fiveInRow' });
    for (const next of [victory, endGame(before, 'white', 'resign'), endGame(before, 'white', 'timeout')]) {
      const reaction = useCharacterReaction();
      reaction.transition(before, next, 'grasshopper');
      expect(reaction.event.value).toBe('end');
      expect(reaction.reactions.value).toEqual({ black: 'win', white: 'lose' });
      expect(reaction.until.value).toBe(Infinity);
    }
  });
});
