import { computed, onUnmounted, ref, watch } from 'vue';
import { useGameStore } from '../stores/game';
import { useTurnTimer } from './useTurnTimer';
import { useOnlineRoom } from './useOnlineRoom';
import { useGameAudio } from './useGameAudio';
import { useCharacterReaction } from './useCharacterReaction';
import { useMoveImpact, IMPACT_MS } from './useMoveImpact';
import { useTimeoutPenalty } from './useTimeoutPenalty';
import { useGameHint } from './useGameHint';
import { useGameAiWorker } from './useGameAiWorker';
import { isPlacement, legalMoves } from '../../shared/game/engine';
import { opposite } from '../../shared/game/state';
import { characterName, otherCharacter, isPieceGame, sideName, DEFAULT_AI_DIFFICULTY, TURN_WARNING_MS, type Color, type GameSettings, type Reaction } from '../../shared/game/types';
export function useGameController() {
  const store = useGameStore();
  const screen = ref<'setup' | 'preparing' | 'lobby' | 'game'>('setup');
  const rematchPreparing = ref(false);
  const audio = useGameAudio(), reaction = useCharacterReaction();
  // Online clocks belong to the server; the compact check reaction must not block a reply.
  const impact = useMoveImpact(() => store.state, () => audio.sfx('taunt'), () => store.settings.mode !== 'online');
  const paused = ref(document.hidden), animating = ref(false);
  const ai = useGameAiWorker(() => store.state, index => {
    if (index !== null && !paused.value) commit(index);
  }, () => {
    const fallback = available.value[0];
    if (fallback !== undefined && !paused.value) commit(fallback);
  });
  const thinking = ai.busy;
  const clock = ref(Date.now());
  const localTimeout = ref<Color | null>(null);
  let remotePenaltyKey: string | null = null;
  let animationTimer: number | undefined;
  let pendingTurn = false;
  let warnedHalf = false;
  let lastCountdownSecond: number | null = null;
  const penalty = useTimeoutPenalty(() => {
    warnedHalf = false; lastCountdownSecond = null;
    if (store.settings.mode === 'online') return;
    timer.start(store.settings.seconds * 1000);
    startAi();
  }, () => audio.sfx('bonk'));
  const timer = useTurnTimer(() => {
    cancelWork(); timer.stop(); reaction.reset(); pendingTurn = false;
    localTimeout.value = store.state.turn;
  });
  const online = useOnlineRoom(room => {
    paused.value = false;
    if (room.game) {
      const before = store.state;
      const changed = before.gameId !== room.game.gameId || before.revision !== room.game.revision;
      store.online(room.game, room.settings); screen.value = 'game'; rematchPreparing.value = false;
      if (changed) {
        warnedHalf = false; lastCountdownSecond = null;
        if (room.game.revision > 0 && before.gameId === room.game.gameId && (isPlacement(before, room.game) || room.game.result)) {
          reaction.transition(before, room.game, store.settings.blackCharacter);
          if (!impact.scene.value || reaction.event.value === 'end') audio.sfx(reaction.event.value, room.game.flipped.length);
        } else reaction.reset();
      }
      if (room.timeout?.phase === 'penalty') {
        const key = `${room.game.gameId}:${room.timeout.resumesAt}`;
        if (remotePenaltyKey !== key) {
          remotePenaltyKey = key; cancelWork(); reaction.reset();
          penalty.begin(room.timeout.loser, room.timeout.resumesAt - room.serverNow);
        }
      } else { remotePenaltyKey = null; penalty.cancel(); }
      timer.sync(room.deadline, room.serverNow);
    } else {
      cancelWork(); penalty.cancel(); timer.stop(); reaction.reset();
      localTimeout.value = null; remotePenaltyKey = null; pendingTurn = false;
      if (room.rematchSetup) {
        store.start(room.settings);
        screen.value = 'preparing';
        rematchPreparing.value = true;
      } else { screen.value = 'lobby'; rematchPreparing.value = false; }
      store.active = false;
    }
  }, () => { cancelWork(); penalty.cancel(); localTimeout.value = null; remotePenaltyKey = null; timer.stop(); store.active = false; screen.value = 'setup'; rematchPreparing.value = false; });
  const myColor = computed<Color>(() => store.settings.mode === 'online' && (screen.value !== 'preparing' || online.room.value?.rematchSetup) ? online.color.value : 'black');
  const available = computed<number[]>(() => legalMoves(store.state));
  const disconnected = computed(() => store.settings.mode === 'online' && (!online.connected.value || online.room.value?.players.some(p => !p.connected)));
  const connectionNotice = computed<string>(() => disconnected.value ? '연결을 기다리고 있어요. 서버 시간은 계속 흐릅니다.' : '');
  const timeoutLoser = computed<Color | null>(() => store.settings.mode === 'online' ? (online.room.value?.timeout?.phase === 'decision' ? online.room.value.timeout.loser : null) : localTimeout.value);
  // A decision begins once per timeout; repeated online snapshots must stay silent.
  watch(timeoutLoser, loser => { if (loser) audio.sfx('timeout'); }, { flush: 'sync' });
  const timeoutPending = computed(() => store.settings.mode === 'online' ? Boolean(online.room.value?.timeout) : localTimeout.value !== null);
  const timeoutDecider = computed(() => timeoutLoser.value ? opposite(timeoutLoser.value) : null);
  const canDecideTimeout = computed(() => timeoutDecider.value !== null && (store.settings.mode !== 'online' || timeoutDecider.value === myColor.value));
  const decisionBlocked = computed(() => Boolean(disconnected.value || online.busy.value || paused.value));
  const canMove = computed(() => screen.value === 'game' && !timeoutPending.value && !store.state.result && !penalty.recipient.value && !impact.busy.value && !animating.value && !thinking.value && !paused.value && !disconnected.value && !online.busy.value && (store.settings.mode !== 'online' || store.state.turn === myColor.value));
  const canHint = computed<boolean>(() => store.settings.mode === 'ai' && store.state.turn === 'black' && canMove.value);
  const hint = useGameHint(() => store.state, canHint);
  function name(color: Color): string { return characterName(color === 'black' ? store.settings.blackCharacter : otherCharacter(store.settings.blackCharacter)); }
  const status = computed(() => {
    if (screen.value === 'preparing') return '설정을 마치면 대국을 시작해요.';
    if (impact.scene.value) {
      if (impact.scene.value.kind !== 'capture') return `${impact.scene.value.kind === 'check' ? '체크' : '장군'}! ${name(impact.scene.value.actor)}의 메롱~ 안전한 수로 벗어나세요.`;
      return `한 수에 ${impact.scene.value.count}개! 메롱~ 잡아 봐!`;
    }
    if (store.state.result) return store.state.result.winner ? `${name(store.state.result.winner)}의 승리!` : '사이좋게 무승부!';
    if (connectionNotice.value) return connectionNotice.value;
    if (paused.value) return '잠시 쉬어가는 중';
    if (timeoutDecider.value) return `${name(timeoutDecider.value)}의 선택을 기다리고 있어요. 대국 시간은 멈춰 있어요.`;
    if (penalty.recipient.value) return `${name(penalty.recipient.value)}, 꿀밤 한 대! 같은 차례로 계속해요.`;
    if (animating.value) return isPieceGame(store.state.gameType) ? '다음 수를 준비하고 있어요…' : store.state.gameType === 'gomoku' ? '돌을 놓고 있어요…' : '돌을 뒤집고 있어요…';
    if (thinking.value) return `${name('white')}가 한 수를 고민하고 있어요…`;
    if (reaction.until.value > clock.value && reaction.message.value) return reaction.message.value;
    if (store.state.check) return `${sideName(store.state.gameType, store.state.check)}의 ${store.state.gameType === 'chess' ? '킹이 체크' : '궁이 장군'} 상태예요. 안전한 수로 벗어나세요.`;
    if (store.settings.mode === 'ai') return isPieceGame(store.state.gameType) ? '당신의 차례예요. 기물을 고르고 이동할 곳을 선택하세요.' : store.state.gameType === 'gomoku' ? '당신의 차례예요. 빈 교차점에 돌을 놓아보세요.' : '당신의 차례예요. 초록 점에 돌을 놓아보세요.';
    return `${name(store.state.turn)} · ${sideName(store.state.gameType, store.state.turn)}의 차례예요.`;
  });
  function mood(color: Color): Reaction {
    if (screen.value === 'preparing') return 'idle';
    if (reaction.corner.value && reaction.corner.value.until > clock.value) return reaction.corner.value.actor === color ? reaction.corner.value.mood : 'sad';
    if (penalty.recipient.value) return penalty.recipient.value === color ? 'sad' : 'happy';
    if (reaction.until.value > clock.value) return reaction.reactions.value[color];
    if (store.state.result) return store.state.result.winner === null ? 'draw' : store.state.result.winner === color ? 'win' : 'lose';
    if (store.state.check === color) return 'urgent';
    if (store.state.turn !== color) return 'idle';
    if (store.settings.seconds && timer.remaining.value <= TURN_WARNING_MS) return 'urgent';
    if (thinking.value || (store.settings.seconds && timer.remaining.value <= store.settings.seconds * 500)) return 'think';
    return 'idle';
  }
  function cancelWork(): void { impact.cancel(); ai.cancel(); window.clearTimeout(animationTimer); animating.value = false; }
  function startAi(): void {
    if (store.settings.mode !== 'ai' || store.state.turn !== 'white' || store.state.result || penalty.recipient.value || paused.value || screen.value !== 'game') return;
    ai.request(store.settings.aiDifficulty ?? DEFAULT_AI_DIFFICULTY);
  }
  function nextTurn(): void { pendingTurn = false; animating.value = false; timer.start(store.settings.seconds * 1000); startAi(); }
  function commit(index: number): void {
    timer.update();
    if (store.state.result || penalty.recipient.value || timeoutPending.value) return;
    const before = store.state;
    if (!store.move(index, timer.remaining.value)) return;
    timer.stop(); warnedHalf = false; lastCountdownSecond = null;
    reaction.transition(before, store.state, store.settings.blackCharacter);
    if (!impact.scene.value || reaction.event.value === 'end') audio.sfx(reaction.event.value, store.state.flipped.length);
    if (store.state.result) { pendingTurn = false; return; }
    animating.value = true; pendingTurn = true;
    const moveDuration = store.state.gameType === 'reversi' ? 460 : 200;
    const impactDuration = impact.scene.value?.kind === 'capture' ? IMPACT_MS + 460 + store.state.flipped.length * 14 : IMPACT_MS;
    animationTimer = window.setTimeout(nextTurn, impact.busy.value ? impactDuration : moveDuration);
  }
  function move(index: number): void {
    if (!canMove.value) return;
    void audio.unlock();
    if (store.settings.mode === 'online') online.gameCommand('move', store.state, index); else commit(index);
  }
  function prepare(settings: GameSettings, rematch = false): void {
    rematchPreparing.value = rematch;
    localTimeout.value = null; remotePenaltyKey = null;
    cancelWork(); penalty.cancel(); timer.stop(); pendingTurn = false; audio.reset(); reaction.reset();
    store.start({ ...settings, aiDifficulty: settings.aiDifficulty ?? DEFAULT_AI_DIFFICULTY });
    store.active = false;
    screen.value = 'preparing'; warnedHalf = false; lastCountdownSecond = null; paused.value = document.hidden;
    void audio.unlock(); audio.sfx('button');
  }
  function start(settings: GameSettings): void {
    rematchPreparing.value = false;
    localTimeout.value = null; remotePenaltyKey = null;
    cancelWork(); penalty.cancel(); pendingTurn = false; audio.reset(); reaction.reset();
    store.start({ ...settings, aiDifficulty: settings.aiDifficulty ?? DEFAULT_AI_DIFFICULTY });
    screen.value = 'game'; warnedHalf = false; lastCountdownSecond = null; paused.value = document.hidden;
    timer.start(settings.seconds * 1000); if (paused.value) timer.pause();
    void audio.unlock(); audio.sfx('button');
  }
  function undo(color?: Color): void {
    if (!(color ? store.canUndoFor(color) : store.canUndo) || timeoutPending.value || (store.settings.mode === 'local' && penalty.recipient.value)) return;
    cancelWork(); penalty.cancel(); pendingTurn = false; audio.reset();
    const restored = store.undo(color);
    if (!restored) return;
    reaction.undo(restored.actor); audio.sfx('undo');
    timer.start(restored.remaining); if (paused.value) timer.pause();
    // A restored turn does not replay timer warnings that already happened.
    warnedHalf = restored.remaining <= store.settings.seconds * 500;
    lastCountdownSecond = restored.remaining <= TURN_WARNING_MS ? Math.ceil(restored.remaining / 1000) : null;
  }
  function chooseTimeout(choice: 'forgive' | 'end'): void {
    if (!canDecideTimeout.value || decisionBlocked.value || timeoutLoser.value === null) return;
    if (store.settings.mode === 'online') { online.timeoutChoice(choice, store.state); return; }
    const loser = timeoutLoser.value;
    localTimeout.value = null;
    if (choice === 'end') { finish(loser, 'timeout'); return; }
    cancelWork(); timer.stop(); reaction.reset(); audio.reset();
    penalty.begin(loser);
  }
  function finish(loser: Color, reason: 'resign' | 'timeout'): void {
    if (store.state.result || screen.value !== 'game') return;
    if (store.settings.mode === 'online') { if (reason === 'resign') online.gameCommand('resign', store.state); return; }
    localTimeout.value = null; cancelWork(); penalty.cancel(); pendingTurn = false; timer.stop();
    const before = store.state; store.finish(loser, reason); reaction.transition(before, store.state, store.settings.blackCharacter); audio.sfx('end');
  }
  async function home(): Promise<void> {
    if (store.settings.mode === 'online' || online.room.value) { if (!(await online.leave())) return; }
    localTimeout.value = null; cancelWork(); penalty.cancel(); pendingTurn = false; timer.stop(); audio.reset(); store.active = false; screen.value = 'setup'; rematchPreparing.value = false; reaction.reset();
  }
  function rematch(): void {
    if (screen.value !== 'game' || !store.state.result) return;
    if (store.settings.mode === 'online') online.gameCommand('rematch', store.state); else prepare(store.settings, true);
  }
  function visibility(): void {
    paused.value = store.settings.mode === 'online' ? false : document.hidden;
    if (screen.value !== 'game' || store.settings.mode === 'online' || store.state.result) return;
    if (document.hidden) { timer.pause(); penalty.pause(); cancelWork(); }
    else if (penalty.recipient.value) penalty.resume();
    else if (timeoutPending.value) return;
    else if (pendingTurn) nextTurn();
    else { timer.resume(); startAi(); }
  }
  document.addEventListener('visibilitychange', visibility);
  const pulse = window.setInterval(() => {
    clock.value = Date.now();
    if (screen.value !== 'game' || store.state.result || !store.settings.seconds || timeoutPending.value || penalty.recipient.value || paused.value || animating.value) return;
    const secondsLeft = Math.ceil(timer.remaining.value / 1000);
    if (timer.remaining.value > 0 && timer.remaining.value <= TURN_WARNING_MS) {
      warnedHalf = true;
      if (secondsLeft !== lastCountdownSecond) {
        lastCountdownSecond = secondsLeft;
        audio.sfx('countdown', secondsLeft);
      }
    } else {
      lastCountdownSecond = null;
      if (timer.remaining.value > 0 && timer.remaining.value <= store.settings.seconds * 500 && !warnedHalf) { warnedHalf = true; audio.sfx('tick'); }
    }
  }, 150);
  watch(() => [screen.value, store.counts.empty, Boolean(store.state.result)] as const, () => {
    audio.changeScene(screen.value !== 'game' ? 'lobby' : store.state.result ? 'off' : store.state.gameType === 'reversi' && store.counts.empty <= 10 ? 'late' : 'game');
  }, { immediate: true });
  if (online.hasSession) online.connect();
  onUnmounted(() => { cancelWork(); window.clearInterval(pulse); document.removeEventListener('visibilitychange', visibility); });
  return { store, screen, rematchPreparing, audio, online, timer, penalty, impact, hint, canHint, status, connectionNotice, thinking, animating, paused, available, canMove, myColor, timeoutLoser, timeoutPending, timeoutDecider, canDecideTimeout, decisionBlocked, chooseTimeout, name, mood, move, prepare, start, undo, finish, home, rematch };
}
