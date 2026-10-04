import { computed, ref } from 'vue';
import { impactKind, LARGE_CAPTURE } from './useMoveImpact';
import { capturedPieceCount, isPieceMove } from '../../shared/game/piece-events';
import { opposite, score } from '../../shared/game/state';
import { REVERSI_CORNERS } from '../../shared/games/reversi/board';
import { isPieceGame, otherCharacter, type Character, type Color, type GameState, type Reaction } from '../../shared/game/types';
export function useCharacterReaction() {
  const reactions = ref<Record<Color, Reaction>>({ black: 'idle', white: 'idle' });
  const until = ref(0);
  const message = ref('');
  const corner = ref<{ actor: Color; mood: 'sly' | 'whistle'; until: number } | null>(null);
  const event = ref<'move' | 'pass' | 'reverse' | 'capture' | 'undo' | 'end' | 'laugh' | 'whistle'>('move');
  function reset(clearCorner = true): void { if (clearCorner) corner.value = null; reactions.value = { black: 'idle', white: 'idle' }; until.value = 0; message.value = ''; }
  function transition(before: GameState, next: GameState, blackCharacter: Character): void {
    const isReversi = before.gameType === 'reversi' && next.gameType === 'reversi';
    reset(!isReversi || impactKind(before, next) !== null);
    const actor = before.turn, rival = opposite(actor);
    event.value = 'move';
    if (next.result) {
      event.value = 'end';
      for (const color of ['black', 'white'] as const) reactions.value[color] = next.result.winner === null ? 'draw' : next.result.winner === color ? 'win' : 'lose';
      until.value = Infinity;
    } else if (isPieceGame(before.gameType) && isPieceMove(before, next)
      && !(typeof document !== 'undefined' && document.hidden)) {
      const captured = capturedPieceCount(before, next) > 0;
      const checking = impactKind(before, next) !== null;
      if (captured || checking) {
        const character = actor === 'black' ? blackCharacter : otherCharacter(blackCharacter);
        reactions.value[actor] = character === 'jannabi' ? 'sly' : 'whistle';
        reactions.value[rival] = 'annoyed';
        if (captured) {
          event.value = character === 'jannabi' ? 'laugh' : 'whistle';
          message.value = character === 'jannabi' ? '이 말은 내가 데려갈게! 흐흐흐…' : '한 수 잘 풀렸네, 휘~♪';
        }
        if (checking) message.value = `${next.gameType === 'chess' ? '체크' : '장군'}! 메~롱, 다음 수는 어떨까?`;
      }
    } else if (isReversi) {
      const a = score(before.board), b = score(next.board);
      if (next.passed) {
        reactions.value[next.passed] = 'pass'; message.value = `${next.passed === 'black' ? '흑' : '백'}은 놓을 곳이 없어 쉬어갑니다.`; event.value = 'pass';
      } else if ((a.black - a.white) * (b.black - b.white) < 0) {
        reactions.value[actor] = 'dance'; reactions.value[rival] = 'sad'; message.value = '판세 역전! 아직 끝난 게 아니지.'; event.value = 'reverse';
      } else if (next.flipped.length >= 3) {
        reactions.value[actor] = 'happy'; reactions.value[rival] = 'sad'; message.value = `한 수에 ${next.flipped.length}개! 멋진 한 수예요.`; event.value = 'capture';
      }
    }
    if (isReversi && before.gameId === next.gameId && next.revision === before.revision + 1 && next.lastMove !== null && before.board[next.lastMove] === null && next.flipped.length > 0 && next.flipped.length < LARGE_CAPTURE && REVERSI_CORNERS.includes(next.lastMove)) {
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
