import { computed, ref } from 'vue';
import { impactKind, LARGE_CAPTURE } from './useMoveImpact';
import { opposite, score } from '../../shared/game/rules';
import { otherCharacter, type Character, type Color, type GameState, type Reaction } from '../../shared/game/types';
export function useCharacterReaction() {
  const reactions = ref<Record<Color, Reaction>>({ black: 'idle', white: 'idle' });
  const until = ref(0);
  const message = ref('');
  const corner = ref<{ actor: Color; mood: 'sly' | 'whistle'; until: number } | null>(null);
  const event = ref<'move' | 'pass' | 'reverse' | 'capture' | 'undo' | 'end' | 'laugh' | 'whistle'>('move');
  function reset(clearCorner = true): void { if (clearCorner) corner.value = null; reactions.value = { black: 'idle', white: 'idle' }; until.value = 0; message.value = ''; }
  function transition(before: GameState, next: GameState, blackCharacter: Character): void {
    reset(impactKind(before, next) !== null);
    const actor = before.turn, rival = opposite(actor);
    const a = score(before.board), b = score(next.board);
    event.value = 'move';
    if (next.result) {
      event.value = 'end';
      for (const color of ['black', 'white'] as const) reactions.value[color] = next.result.winner === null ? 'draw' : next.result.winner === color ? 'win' : 'lose';
      until.value = Infinity;
    } else if (next.passed) {
      reactions.value[next.passed] = 'pass'; message.value = `${next.passed === 'black' ? '흑' : '백'}은 놓을 곳이 없어 쉬어갑니다.`; event.value = 'pass';
    } else if ((a.black - a.white) * (b.black - b.white) < 0) {
      reactions.value[actor] = 'dance'; reactions.value[rival] = 'sad'; message.value = '판세 역전! 아직 끝난 게 아니지.'; event.value = 'reverse';
    } else if (next.flipped.length >= 3) {
      reactions.value[actor] = 'happy'; reactions.value[rival] = 'sad'; message.value = `한 수에 ${next.flipped.length}개! 멋진 한 수예요.`; event.value = 'capture';
    }
    if (before.gameId === next.gameId && next.revision === before.revision + 1 && next.lastMove !== null && before.board[next.lastMove] === null && next.flipped.length > 0 && next.flipped.length < LARGE_CAPTURE && [0, 7, 56, 63].includes(next.lastMove)) {
      const character = actor === 'black' ? blackCharacter : otherCharacter(blackCharacter);
      corner.value = { actor, mood: character === 'jannabi' ? 'sly' : 'whistle', until: Date.now() + 2600 };
      event.value = character === 'jannabi' ? 'laugh' : 'whistle';
      message.value = character === 'jannabi' ? '모서리는 내 거! 흐흐흐…' : '모서리도 차지했으니, 휘~♪';
    }
    if (!next.result) until.value = Date.now() + 2600;
  }
  function undo(actor: Color): void { corner.value = null; reactions.value = { black: 'annoyed', white: 'annoyed' }; reactions.value[actor] = 'undo'; until.value = Date.now() + 2400; message.value = '잠깐, 방금 건 연습이었어!'; event.value = 'undo'; }
  const transient = computed(() => message.value);
  return { corner, reactions, until, message: transient, event, reset, transition, undo };
}
