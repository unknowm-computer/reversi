<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGameController } from './composables/useGameController';
import { DEFAULT_AI_DIFFICULTY, gameName, isPieceGame, otherCharacter, type Character, type Color, type GameSettings, type GameType } from '../shared/game/types';
import { JANGGI_PASS } from '../shared/game/pieces';
import SetupPanel from './components/game/SetupPanel.vue';
import GameSetupForm from './components/game/GameSetupForm.vue';
import VictoryScene from './components/game/VictoryScene.vue';
import MoveImpact from './components/game/MoveImpact.vue';
import TimeoutChoiceScene from './components/game/TimeoutChoiceScene.vue';
import TimeoutPenalty from './components/game/TimeoutPenalty.vue';
import GameBoard from './components/game/GameBoard.vue';
import GomokuBoard from './components/game/GomokuBoard.vue';
import PieceBoard from './components/game/PieceBoard.vue';
import PieceMatchSidebar from './components/game/PieceMatchSidebar.vue';
import GameRules from './components/game/GameRules.vue';
import PlayerPanel from './components/game/PlayerPanel.vue';
import ResultPanel from './components/game/ResultPanel.vue';
import OnlineLobby from './components/game/OnlineLobby.vue';
import AppIcon from './components/common/AppIcon.vue';
import ModalDialog from './components/common/ModalDialog.vue';
import AppHeader from './components/common/AppHeader.vue';
import MatchDetails from './components/game/MatchDetails.vue';
import ReversiMatchSidebar from './components/game/ReversiMatchSidebar.vue';
import GomokuMatchSidebar from './components/game/GomokuMatchSidebar.vue';
import TimeoutDecisionContent from './components/game/TimeoutDecisionContent.vue';

const game = useGameController();
const { store, screen, online, audio, timer, status, myColor, available, canMove } = game;
const modal = ref<'rules' | 'resign' | 'home' | null>(null);
const resigningColor = ref<Color>('black');
const resultDismissed = ref(false);
const selectedGameType = ref<GameType>('reversi');
const activeGameType = computed<GameType>(() => screen.value === 'setup'
  ? selectedGameType.value
  : screen.value === 'lobby' ? online.room.value?.settings.gameType ?? 'reversi' : store.state.gameType);
const moveCount = computed<number>(() => store.state.board.length - store.counts.empty);
watch(game.timeoutLoser, loser => { if (loser) modal.value = null; });
const bottom = computed<Color>(() => myColor.value);
const top = computed<Color>(() => bottom.value === 'black' ? 'white' : 'black');
const isLocal = computed<boolean>(() => store.settings.mode === 'local');
const isAskingMercy = computed<boolean>(() => store.settings.mode === 'ai' && game.timeoutLoser.value === myColor.value);
const canResign = computed<boolean>(() => screen.value === 'game' && !store.state.result && !game.timeoutPending.value);
const modeName = computed(() => ({ ai: '혼자 놀기', local: '함께 놀기', online: '온라인 대전' })[store.settings.mode]);
const rematchRequested = computed<boolean>(() => store.settings.mode === 'online' && Boolean(online.room.value?.players.find(player => player.color === myColor.value)?.rematch));
const rematchDisabled = computed<boolean>(() => store.settings.mode === 'online' && (rematchRequested.value || game.decisionBlocked.value));
const onlineRematchSetup = computed(() => {
  const room = online.room.value;
  if (!room?.rematchSetup) return undefined;
  return { phase: room.rematchSetup, host: online.color.value === 'black', ready: Boolean(room.players.find(player => player.color === online.color.value)?.ready) };
});
const victoryPlayed = ref(false);
const victoryPending = computed(() => screen.value === 'game' && Boolean(store.state.result?.winner) && !victoryPlayed.value);
watch(() => `${store.state.gameId}:${Boolean(store.state.result)}`, () => { victoryPlayed.value = false; }, { flush: 'sync' });
const resultVisible = computed(() => screen.value === 'game' && !game.impact.busy.value && !victoryPending.value && store.state.result && !resultDismissed.value && !modal.value);
watch(() => store.state.result, () => { resultDismissed.value = false; });
function character(color: Color): Character { return color === 'black' ? store.settings.blackCharacter : otherCharacter(store.settings.blackCharacter); }
function undoCount(color: Color): number | '∞' {
  if (store.settings.mode === 'online') return 0;
  if (store.settings.mode === 'ai' || store.settings.undoLimit === -1) return '∞';
  return Math.max(0, store.settings.undoLimit - store.undoUsed[color]);
}
function showActions(color: Color): boolean {
  return screen.value === 'game' && !store.state.result && store.state.turn === color && (isLocal.value || color === myColor.value);
}
function confirmSetup(settings: GameSettings): void {
  if (screen.value !== 'preparing' || online.busy.value) return;
  if (onlineRematchSetup.value) {
    if (onlineRematchSetup.value.phase === 'editing') online.configureRematch(settings);
    else online.ready();
  } else if (settings.mode === 'online') void online.enter('create', settings);
  else game.start(settings);
}
function requestHome(): void { if ((screen.value === 'game' && !store.state.result) || screen.value === 'lobby') modal.value = 'home'; else void game.home(); }
function canUndoFor(color: Color): boolean {
  return showActions(color) && store.canUndoFor(color) && !game.timeoutPending.value && !(isLocal.value && game.penalty.recipient.value);
}
function undoFor(color: Color): void { if (canUndoFor(color)) game.undo(color); }
function canPassFor(color: Color): boolean {
  return activeGameType.value === 'janggi' && showActions(color) && canMove.value && !modal.value && !resultVisible.value && available.value.includes(JANGGI_PASS);
}
function passFor(color: Color): void { if (canPassFor(color)) game.move(JANGGI_PASS); }
function requestResign(color: Color): void {
  if (!canResign.value || !showActions(color)) return;
  resigningColor.value = color;
  modal.value = 'resign';
}
function confirm(): void {
  if (modal.value === 'home') void game.home();
  else if (modal.value === 'resign' && canResign.value) game.finish(resigningColor.value, 'resign');
  modal.value = null;
}
</script>
<template>
  <div class="app-shell" :class="{ 'is-playing': screen === 'game' || screen === 'preparing' }" @pointerdown.once="audio.unlock()" @keydown.once="audio.unlock()">
    <AppHeader
      :compact="screen === 'game' || screen === 'preparing'"
      :show-home="screen !== 'setup'"
      :show-rematch="screen === 'game' && Boolean(store.state.result)"
      :rematch-requested="rematchRequested"
      :rematch-disabled="rematchDisabled"
      :sound-enabled="audio.enabled.value"
      @home="requestHome"
      @rematch="game.rematch"
      @rules="modal = 'rules'"
      @toggle-sound="audio.toggle()"
    />
    <main>
      <SetupPanel
        v-if="screen === 'setup'"
        :connected="online.connected.value"
        :busy="online.busy.value"
        :error="online.error.value"
        @game-type="selectedGameType = $event"
        @start="game.prepare"
        @online="online.connect"
        @create="game.prepare"
        @join="(config, code) => online.enter('join', config, code)"
      />
      <OnlineLobby
        v-else-if="screen === 'lobby' && online.room.value"
        :room="online.room.value"
        :color="online.color.value"
        :busy="online.busy.value"
        :connected="online.connected.value"
        :error="online.error.value"
        @ready="online.ready"
        @character="online.chooseCharacter"
        @leave="requestHome"
      />
      <section v-else-if="screen === 'game' || screen === 'preparing'" class="game-layout" :class="{ 'is-janggi': activeGameType === 'janggi' }">
        <div class="play-area">
          <h1 class="sr-only">{{ gameName(activeGameType) }} · {{ modeName }}</h1>
          <PlayerPanel
            :game-type="activeGameType"
            :character="character(top)" :color="top" :count="store.counts[top]" :active="screen === 'game' && !store.state.result && store.state.turn === top"
            :mood="game.mood(top)" :remaining="timer.remaining.value" :seconds="store.settings.seconds" :undo-count="undoCount(top)"
            :show-actions="showActions(top)" :can-undo="canUndoFor(top)" :can-resign="canResign" @undo="undoFor(top)" @resign="requestResign(top)"
            :can-pass="canPassFor(top)" :pass-suggested="game.hint.index.value === JANGGI_PASS" :bikjang="Boolean(store.state.janggi?.bikjang)" @pass="passFor(top)"
          />
          <p class="sr-only" role="status" aria-live="polite">{{ status }}</p>
          <p v-if="game.connectionNotice.value" class="connection-notice" role="alert">{{ game.connectionNotice.value }}</p>
          <div class="board-stage">
            <PieceBoard
              v-if="isPieceGame(activeGameType)"
              :state="store.state"
              :legal="available"
              :interactive="canMove && !modal && !resultVisible"
              :hint-index="game.hint.index.value"
              :perspective="myColor"
              @move="game.move"
            />
            <GomokuBoard
              v-else-if="activeGameType === 'gomoku'"
              :board="store.state.board"
              :turn="store.state.turn"
              :interactive="canMove && !modal && !resultVisible"
              :hint-index="game.hint.index.value"
              :last-move="store.state.lastMove"
              :winning-line="store.state.winningLine"
              @move="game.move"
            />
            <GameBoard
              v-else
              :board="game.impact.displayed.value.board"
              :legal="game.impact.busy.value ? [] : available"
              :turn="store.state.turn"
              :interactive="canMove && !modal && !resultVisible"
              :hint-index="game.hint.index.value"
              :last-move="store.state.lastMove"
              :flipped="game.impact.displayed.value.flipped"
              :revision="store.state.revision"
              @move="game.move"
            />
            <MoveImpact
              v-if="game.impact.scene.value"
              :actor="character(game.impact.scene.value.actor)"
              :kind="game.impact.scene.value.kind"
              :count="game.impact.scene.value.count"
              :compact="store.settings.mode === 'online' && game.impact.scene.value.kind !== 'capture'"
            />
            <TimeoutPenalty
              v-if="game.penalty.recipient.value"
              :recipient="character(game.penalty.recipient.value)"
              :paused="game.paused.value"
              :elapsed="game.penalty.elapsed.value"
            />
          </div>
          <PlayerPanel
            :game-type="activeGameType"
            :character="character(bottom)" :color="bottom" :count="store.counts[bottom]" :active="screen === 'game' && !store.state.result && store.state.turn === bottom"
            :mood="game.mood(bottom)" :remaining="timer.remaining.value" :seconds="store.settings.seconds" :undo-count="undoCount(bottom)"
            :show-actions="showActions(bottom)" :can-undo="canUndoFor(bottom)" :can-resign="canResign" @undo="undoFor(bottom)" @resign="requestResign(bottom)"
            :can-pass="canPassFor(bottom)" :pass-suggested="game.hint.index.value === JANGGI_PASS" :bikjang="Boolean(store.state.janggi?.bikjang)" @pass="passFor(bottom)"
            :show-hint="store.settings.mode === 'ai'" :can-hint="game.canHint.value" :hint-busy="game.hint.busy.value" @hint="game.hint.request"
          />
          <p v-if="game.hint.error.value" class="game-error" role="alert">{{ game.hint.error.value }}</p>
          <div v-if="store.state.result" class="game-controls">
            <button class="text-button" @click="resultDismissed = false">결과 보기<AppIcon name="arrow" /></button>
          </div>
          <p v-if="store.settings.mode === 'online' && online.error.value" class="game-error" role="alert">{{ online.error.value }}</p>
        </div>
        <MatchDetails
          :mode-name="`${gameName(activeGameType)} · ${modeName}`"
          :ai-difficulty="store.settings.mode === 'ai' ? store.settings.aiDifficulty ?? DEFAULT_AI_DIFFICULTY : null"
          :room-code="store.settings.mode === 'online' ? online.room.value?.code ?? null : null"
          :seconds="store.settings.seconds"
        >
          <PieceMatchSidebar v-if="isPieceGame(activeGameType)" :state="store.state" />
          <GomokuMatchSidebar v-else-if="activeGameType === 'gomoku'" :move-count="moveCount" :turn="store.state.turn" :result="store.state.result" />
          <ReversiMatchSidebar v-else :counts="store.counts" />
        </MatchDetails>
      </section>
    </main>
    <footer class="site-footer">
      <span>작은 보드 위, 우리의 느긋한 승부.</span>
      <span class="footer-mark"><AppIcon name="leaf" />MADE FOR A LITTLE BREAK</span>
    </footer>
    <VictoryScene
      v-if="victoryPending && !game.impact.busy.value && !modal"
      :winner="character(store.state.result!.winner!)"
      @done="victoryPlayed = true"
      @hit="audio.sfx('bonk')"
    />
    <ModalDialog v-if="screen === 'preparing'" class="game-setup-dialog" :title="onlineRematchSetup ? '한 판 더! 이번 설정은?' : '우리, 한 판 놀까?'" :dismissible="!online.busy.value" @close="game.home">
      <GameSetupForm
        :settings="store.settings"
        :busy="online.busy.value"
        :connected="online.connected.value"
        :error="store.settings.mode === 'online' ? online.error.value : ''"
        :online-rematch="onlineRematchSetup"
        @confirm="confirmSetup"
        @cancel="game.home"
      />
    </ModalDialog>
    <ModalDialog
      v-else-if="game.timeoutLoser.value && game.canDecideTimeout.value"
      :dismissible="false"
      :title="isAskingMercy ? '시간 초과… 한 번만 봐주세요!' : '시간 초과! 한 번 봐줄까요?'"
    >
      <TimeoutDecisionContent
        :recipient="character(game.timeoutLoser.value)"
        :asking-mercy="isAskingMercy"
        :loser-name="game.name(game.timeoutLoser.value)"
        :decider-name="game.name(game.timeoutDecider.value!)"
        :seconds="store.settings.seconds"
        :blocked="game.decisionBlocked.value"
        :error="store.settings.mode === 'online' ? online.error.value : null"
        @choose="game.chooseTimeout"
      />
    </ModalDialog>
    <ModalDialog
      v-else-if="store.settings.mode === 'online' && game.timeoutLoser.value"
      :dismissible="false"
      title="상대의 결정을 기다리고 있어요"
    >
      <TimeoutChoiceScene :recipient="character(game.timeoutLoser.value)" begging />
      <p class="confirm-text" role="status">시간이 초과됐어요. 상대가 이번 한 수를 봐줄지 결정하고 있어요.<br>결정이 도착하면 자동으로 이어집니다. 잠시만 기다려 주세요.</p>
      <p v-if="game.connectionNotice.value" class="game-error" role="alert">{{ game.connectionNotice.value }}</p>
    </ModalDialog>
    <ModalDialog v-else-if="modal === 'rules'" title="게임 방법" size="wide" @close="modal = null">
      <GameRules :game-type="activeGameType" @close="modal = null" />
    </ModalDialog>
    <ModalDialog
      v-else-if="modal === 'resign' || modal === 'home'"
      :title="modal === 'resign' ? '이번 판은 여기까지 할까요?' : '처음으로 돌아갈까요?'"
      @close="modal = null"
    >
      <p class="confirm-text">{{ modal === 'resign' ? `${game.name(resigningColor)}의 기권으로 대국이 끝나요.` : store.settings.mode === 'online' || screen === 'lobby' ? '방을 나가면 친구와의 대국도 종료돼요.' : '진행 중인 대국은 저장되지 않아요.' }}</p>
      <div class="confirm-actions">
        <button class="secondary" @click="modal = null">계속하기</button>
        <button class="primary" @click="confirm">{{ modal === 'resign' ? '기권하기' : '돌아가기' }}</button>
      </div>
    </ModalDialog>
    <ModalDialog v-else-if="resultVisible" title="오늘의 한 판" @close="resultDismissed = true">
      <ResultPanel
        :game="store.state"
        :black-character="store.settings.blackCharacter"
        :can-undo="store.canUndo"
        :online="store.settings.mode === 'online'"
        :requested="rematchRequested"
        :busy="online.busy.value"
        @rematch="game.rematch"
        @home="game.home"
        @undo="game.undo"
      />
    </ModalDialog>
  </div>
</template>
<style scoped lang="scss">
@use './styles/tokens' as *;

.app-shell { max-width: 1240px; margin: auto; padding: 0 44px; }
.app-shell.is-playing { padding-inline: var(--space-8); }
.site-footer { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; border-top: 1px solid var(--line); padding: 25px 0 30px; color: var(--muted); font-size: var(--text-caption); }
.footer-mark { display: flex; gap: 8px; align-items: center; font-family: ui-monospace, monospace; font-size: var(--text-micro); letter-spacing: .12em; }
.footer-mark svg { width: 13px; }
.game-layout {
  --board-size: clamp(580px, calc(100dvh - 300px), 720px);
  display: grid;
  grid-template-columns: minmax(0, var(--board-size)) 240px;
  justify-content: center;
  gap: var(--space-8);
  padding-block: var(--space-6) var(--space-8);
  align-items: start;
}
.game-layout.is-janggi { --board-size: clamp(440px, calc((100dvh - 400px) * .9), 720px); }
.board-stage { position: relative; isolation: isolate; margin-block: var(--space-2) var(--space-3); }
.connection-notice { margin-top: var(--space-3); font-size: var(--text-small); color: var(--danger); }
.play-area { min-width: 0; }
.game-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
.game-controls svg { width: 15px; }
.game-controls .text-button { font-size: var(--text-small); }
.game-error { color: var(--danger); font-size: var(--text-small); margin: 12px 0; }
.confirm-text { color: var(--muted); font-size: var(--text-body); line-height: 1.8; }
.confirm-actions { display: flex; gap: 10px; margin-top: 25px; }
.confirm-actions button { flex: 1; font-size: var(--text-label); }

@media (max-width: $compact) {
  .app-shell { padding: 0 28px; }
  .game-layout { grid-template-columns: minmax(0, var(--board-size)); gap: var(--space-6); }
}
@media (max-width: $mobile) {
  .game-setup-dialog :deep(.modal-inner) { padding: var(--space-6) var(--space-4) var(--space-4); }
  .game-setup-dialog :deep(.modal-inner > h2) { margin-bottom: var(--space-3); }
  .app-shell { padding: 0 18px; }
  .app-shell.is-playing { padding-inline: var(--space-3); }
  .site-footer { margin-top: 24px; font-size: var(--text-caption); }
  .footer-mark { font-size: var(--text-micro); letter-spacing: .04em; }
  .game-layout { grid-template-columns: minmax(0, 1fr); max-width: 720px; margin-inline: auto; padding-block: var(--space-4); gap: var(--space-6); }
}
</style>
