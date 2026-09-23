<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGameController } from './composables/useGameController';
import { otherCharacter, type Character, type Color } from '../shared/game/types';
import SetupPanel from './components/game/SetupPanel.vue';
import VictoryScene from './components/game/VictoryScene.vue';
import MoveImpact from './components/game/MoveImpact.vue';
import TimeoutChoiceScene from './components/game/TimeoutChoiceScene.vue';
import TimeoutPenalty from './components/game/TimeoutPenalty.vue';
import GameBoard from './components/game/GameBoard.vue';
import GameRules from './components/game/GameRules.vue';
import PlayerPanel from './components/game/PlayerPanel.vue';
import ResultPanel from './components/game/ResultPanel.vue';
import OnlineLobby from './components/game/OnlineLobby.vue';
import AppIcon from './components/common/AppIcon.vue';
import ModalDialog from './components/common/ModalDialog.vue';
const game = useGameController();
const { store, screen, online, audio, timer, status, myColor, available, canMove } = game;
const modal = ref<'rules' | 'resign' | 'home' | null>(null);
const resigningColor = ref<Color>('black');
const resultDismissed = ref(false);
watch(game.timeoutLoser, loser => { if (loser) modal.value = null; });
const bottom = computed<Color>(() => myColor.value);
const top = computed<Color>(() => bottom.value === 'black' ? 'white' : 'black');
const isLocal = computed<boolean>(() => store.settings.mode === 'local');
const isAskingMercy = computed<boolean>(() => store.settings.mode === 'ai' && game.timeoutLoser.value === myColor.value);
const canResign = computed<boolean>(() => !store.state.result && !game.timeoutPending.value);
const modeName = computed(() => ({ ai: '혼자 놀기', local: '함께 놀기', online: '온라인 대전' })[store.settings.mode]);
const percentBlack = computed(() => store.counts.black / (64 - store.counts.empty) * 100);
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
  return !store.state.result && store.state.turn === color && (isLocal.value || color === myColor.value);
}
function requestHome(): void { if ((screen.value === 'game' && !store.state.result) || screen.value === 'lobby') modal.value = 'home'; else void game.home(); }
function canUndoFor(color: Color): boolean {
  return showActions(color) && store.canUndoFor(color) && !game.timeoutPending.value && !(isLocal.value && game.penalty.recipient.value);
}
function undoFor(color: Color): void { if (canUndoFor(color)) game.undo(color); }
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
  <div class="app-shell" @pointerdown.once="audio.unlock()" @keydown.once="audio.unlock()">
    <header class="site-header"><button class="brand" aria-label="잔나비와 베짱이 시작 화면" @click="requestHome"><span class="brand-mark"><i /><i /></span><span class="brand-name">잔나비와 베짱이<small>THE LITTLE REVERSI CLUB</small></span></button><nav aria-label="게임 안내"><button v-if="screen !== 'setup'" class="text-button nav-link" aria-label="처음으로" title="처음으로" @click="requestHome"><AppIcon name="home" /><span>처음으로</span></button><button class="text-button nav-link" aria-label="게임 방법" @click="modal = 'rules'"><AppIcon name="help" /><span>게임 방법</span></button><span class="nav-divider" /><button class="sound-button" :aria-label="audio.enabled.value ? '사운드 끄기' : '사운드 켜기'" :aria-pressed="audio.enabled.value" @click="audio.toggle()"><AppIcon :name="audio.enabled.value ? 'sound' : 'muted'" /></button></nav></header>
    <main>
      <SetupPanel v-if="screen === 'setup'" :connected="online.connected.value" :busy="online.busy.value" :error="online.error.value" @start="game.start" @online="online.connect" @create="config => online.enter('create', config)" @join="(config, code) => online.enter('join', config, code)" />
      <OnlineLobby v-else-if="screen === 'lobby' && online.room.value" :room="online.room.value" :color="online.color.value" :busy="online.busy.value" :connected="online.connected.value" :error="online.error.value" @ready="online.ready" @character="online.chooseCharacter" @leave="requestHome" />
      <section v-else-if="screen === 'game'" class="game-layout">
        <aside class="game-story"><p class="eyebrow muted">{{ modeName }}<span v-if="online.room.value && store.settings.mode === 'online'"> · {{ online.room.value.code }}</span></p><h1>작은 한 수가<br>판을 바꾸니까.</h1><p>서두르지 않아도 괜찮아요.<br>다음 한 수를 즐겨보세요.</p><div class="story-divider" /><div class="match-info"><span>오늘의 규칙</span><strong>{{ store.settings.seconds ? `한 수에 ${store.settings.seconds}초` : '시간 제한 없이, 여유롭게' }}</strong></div><button class="text-button story-help" @click="modal = 'rules'">처음이라면, 게임 방법<AppIcon name="arrow" /></button><div class="story-quote">“끝날 때까지<br>끝난 게 아니지!”<span>— 잔나비, 언제나 자신 있게</span></div></aside>
        <div class="play-area">
          <div class="game-topline"><span class="eyebrow">{{ modeName }}</span><span>{{ store.state.revision === 0 ? '새로운 한 판' : `${64 - store.counts.empty} / 64` }}</span></div>
          <PlayerPanel
            :character="character(top)" :color="top" :count="store.counts[top]" :active="!store.state.result && store.state.turn === top"
            :mood="game.mood(top)" :remaining="timer.remaining.value" :seconds="store.settings.seconds" :undo-count="undoCount(top)"
            :show-actions="showActions(top)" :can-undo="canUndoFor(top)" :can-resign="canResign" @undo="undoFor(top)" @resign="requestResign(top)"
          />
          <p class="sr-only" role="status" aria-live="polite">{{ status }}</p>
          <p v-if="game.connectionNotice.value" class="connection-notice" role="alert">{{ game.connectionNotice.value }}</p>
          <div class="board-stage"><GameBoard :board="game.impact.displayed.value.board" :legal="game.impact.busy.value ? [] : available" :turn="store.state.turn" :interactive="canMove && !modal && !resultVisible" :hint-index="game.hint.index.value" :last-move="store.state.lastMove" :flipped="game.impact.displayed.value.flipped" :revision="store.state.revision" @move="game.move" /><MoveImpact v-if="game.impact.scene.value" :actor="character(game.impact.scene.value.actor)" :kind="game.impact.scene.value.kind" :count="game.impact.scene.value.count" /><TimeoutPenalty v-if="game.penalty.recipient.value" :recipient="character(game.penalty.recipient.value)" :paused="game.paused.value" :elapsed="game.penalty.elapsed.value" /></div>
          <PlayerPanel
            :character="character(bottom)" :color="bottom" :count="store.counts[bottom]" :active="!store.state.result && store.state.turn === bottom"
            :mood="game.mood(bottom)" :remaining="timer.remaining.value" :seconds="store.settings.seconds" :undo-count="undoCount(bottom)"
            :show-actions="showActions(bottom)" :can-undo="canUndoFor(bottom)" :can-resign="canResign" @undo="undoFor(bottom)" @resign="requestResign(bottom)"
            :show-hint="store.settings.mode === 'ai'" :can-hint="game.canHint.value" :hint-busy="game.hint.busy.value" @hint="game.hint.request"
          />
          <p v-if="game.hint.error.value" class="game-error" role="alert">{{ game.hint.error.value }}</p>
          <div v-if="store.state.result" class="game-controls">
            <button class="text-button" @click="resultDismissed = false">결과 보기<AppIcon name="arrow" /></button>
          </div>
          <p v-if="store.settings.mode === 'online' && online.error.value" class="game-error" role="alert">{{ online.error.value }}</p>
        </div>
        <aside class="match-sidebar"><div class="match-card"><p class="eyebrow muted">ON THE BOARD</p><h2>지금, 보드 위에는</h2><div class="score-summary"><div><span class="summary-stone black" />흑<strong>{{ store.counts.black }}</strong></div><span class="score-colon">:</span><div><strong>{{ store.counts.white }}</strong>백<span class="summary-stone white" /></div></div><div class="score-bar"><span :style="{ width: `${percentBlack}%` }" /></div><p class="empty-count">빈칸 <strong>{{ store.counts.empty }}</strong>개 · 아직 기회는 있어요</p></div><div class="tip-card"><span class="tip-icon"><AppIcon name="leaf" /></span><p class="eyebrow">A LITTLE TIP</p><h3>{{ store.counts.empty <= 10 ? '마지막 한 수까지' : '모서리를 눈여겨보세요' }}</h3><p>{{ store.counts.empty <= 10 ? '이제 얼마 남지 않았어요. 마지막에 더 많은 돌을 가진 쪽이 승리해요.' : '한번 차지한 모서리의 돌은 뒤집히지 않아요. 든든한 내 편이 되어줄 거예요.' }}</p></div></aside>
      </section>
    </main>
    <footer class="site-footer"><span>작은 보드 위, 우리의 느긋한 승부.</span><span class="footer-mark"><AppIcon name="leaf" />MADE FOR A LITTLE BREAK</span></footer>
    <VictoryScene :winner="character(store.state.result!.winner!)" v-if="victoryPending && !game.impact.busy.value && !modal" @done="victoryPlayed = true" @hit="audio.sfx('bonk')" />
    <ModalDialog v-if="game.timeoutLoser.value && game.canDecideTimeout.value" :dismissible="false" :title="isAskingMercy ? '시간 초과… 한 번만 봐주세요!' : '시간 초과! 한 번 봐줄까요?'">
      <TimeoutChoiceScene :recipient="character(game.timeoutLoser.value)" :begging="isAskingMercy" />
      <template v-if="isAskingMercy">
        <p class="confirm-text">자, 잠깐만요… 생각하다 보니 시간이 다 됐네요.<br>제가 잘못했어요. 제발 이번 한 번만 봐주세요!</p>
        <p class="confirm-text">꿀밤 한 대는 달게 받을게요. {{ store.settings.seconds }}초만 더 주시면 안 될까요…?<br>더는 부탁하지 않으려면 패배를 인정하고 이번 판을 마칠 수 있어요.</p>
      </template>
      <template v-else>
        <p class="confirm-text">{{ game.name(game.timeoutLoser.value) }}의 시간이 다 됐어요.<br>{{ game.name(game.timeoutDecider.value!) }}, 이번엔 어떻게 할까요?</p>
        <p class="confirm-text">봐주면 꿀밤 한 대 후 같은 차례에서 {{ store.settings.seconds }}초를 새로 드려요. 게임 종료를 선택하면 {{ game.name(game.timeoutDecider.value!) }}의 승리예요.</p>
      </template>
      <div class="confirm-actions"><button class="secondary" :disabled="game.decisionBlocked.value" @click="game.chooseTimeout('forgive')">{{ isAskingMercy ? '제발 봐주세요' : '봐준다' }}</button><button class="primary" :disabled="game.decisionBlocked.value" @click="game.chooseTimeout('end')">{{ isAskingMercy ? '패배를 인정한다' : '게임 종료' }}</button></div>
      <p v-if="store.settings.mode === 'online' && online.error.value" class="game-error" role="alert">{{ online.error.value }}</p>
      <p v-if="game.decisionBlocked.value" class="confirm-text">연결과 요청 처리를 기다리고 있어요.</p>
    </ModalDialog>
    <ModalDialog v-else-if="modal === 'rules'" title="한 판이면 익숙해져요." @close="modal = null"><GameRules @close="modal = null" /></ModalDialog>
    <ModalDialog v-else-if="modal === 'resign' || modal === 'home'" :title="modal === 'resign' ? '이번 판은 여기까지 할까요?' : '처음으로 돌아갈까요?'" @close="modal = null"><p class="confirm-text">{{ modal === 'resign' ? `${game.name(resigningColor)}의 기권으로 대국이 끝나요.` : store.settings.mode === 'online' || screen === 'lobby' ? '방을 나가면 친구와의 대국도 종료돼요.' : '진행 중인 대국은 저장되지 않아요.' }}</p><div class="confirm-actions"><button class="secondary" @click="modal = null">계속하기</button><button class="primary" @click="confirm">{{ modal === 'resign' ? '기권하기' : '돌아가기' }}</button></div></ModalDialog>
    <ModalDialog v-else-if="resultVisible" title="오늘의 한 판" @close="resultDismissed = true"><ResultPanel :game="store.state" :black-character="store.settings.blackCharacter" :can-undo="store.canUndo" :online="store.settings.mode === 'online'" :requested="Boolean(online.room.value?.players.find(p => p.color === myColor)?.rematch)" :busy="online.busy.value" @rematch="game.rematch" @home="game.home" @undo="game.undo" /></ModalDialog>
  </div>
</template>
<style scoped lang="scss">
@use './styles/tokens' as *;
.app-shell { max-width: 1240px; margin: auto; padding: 0 44px; }
.site-header { display: flex; align-items: center; justify-content: space-between; height: 100px; border-bottom: 1px solid var(--line); }.brand { display: flex; align-items: center; gap: 13px; text-align: left; }.brand-mark { width: 36px; height: 36px; position: relative; }.brand-mark i { position: absolute; width: 26px; height: 26px; border-radius: 50%; background: var(--green); left: 0; top: 0; }.brand-mark i + i { background: #e9e9d5; border: 1px solid #b6bea1; left: 13px; top: 12px; box-shadow: 0 2px 2px #283c2e15; }.brand-name { font-size: 19px; font-weight: 750; letter-spacing: -.035em; }.brand-name small { display: block; font-family: ui-monospace, monospace; font-size: var(--text-micro); letter-spacing: .14em; color: var(--muted); margin-top: 5px; font-weight: 400; }nav { display: flex; align-items: center; gap: 17px; }.nav-link { font-size: var(--text-small); }.nav-link svg { width: 16px; }.nav-divider { height: 17px; width: 1px; background: var(--line); }.sound-button { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid var(--line); border-radius: 50%; background: var(--card); }.sound-button svg { width: 17px; }
.site-footer { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; border-top: 1px solid var(--line); padding: 25px 0 30px; color: var(--muted); font-size: var(--text-caption); }.footer-mark { display: flex; gap: 8px; align-items: center; font-family: ui-monospace, monospace; font-size: var(--text-micro); letter-spacing: .12em; }.footer-mark svg { width: 13px; }
.game-layout { display: grid; grid-template-columns: minmax(150px, 1fr) minmax(320px, 500px) minmax(170px, 1fr); gap: 38px; padding: 32px 0 42px; align-items: start; }.game-story { padding-top: 4px; }.game-story .eyebrow { font-family: inherit; font-size: var(--text-caption); letter-spacing: .05em; }.game-story h1 { font-size: clamp(25px, 2.5vw, 34px); line-height: 1.5; letter-spacing: -.06em; margin: 16px 0; }.game-story > p:not(.eyebrow) { font-size: var(--text-small); color: var(--muted); line-height: 1.9; }.story-divider { width: 28px; height: 1px; background: #b6bda2; margin: 32px 0; }.match-info { display: flex; flex-direction: column; gap: 10px; }.match-info > span { font-size: var(--text-caption); color: var(--muted); line-height: 1.7; }.match-info > strong { font-size: var(--text-label); }.story-help { font-size: var(--text-caption); margin: 18px 0 0 -10px; }.story-help svg { width: 14px; }.story-quote { margin-top: 45px; color: var(--text-accent); font-family: Georgia, serif; font-size: 21px; line-height: 1.6; letter-spacing: -.04em; }.story-quote span { display: block; font-family: system-ui, sans-serif; font-size: var(--text-caption); margin-top: 12px; letter-spacing: 0; color: var(--muted); }
.board-stage { position: relative; isolation: isolate; margin-block: var(--space-4) var(--space-6); }
.connection-notice { margin-top: var(--space-3); font-size: var(--text-small); color: var(--danger); }
.play-area { min-width: 0; }.game-topline { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: var(--text-caption); color: var(--muted); }.game-topline .eyebrow { font-family: inherit; font-size: var(--text-small); letter-spacing: .08em; color: var(--ink); }.game-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }.game-controls svg { width: 15px; }.game-controls .text-button { font-size: var(--text-small); }.game-error { color: var(--danger); font-size: var(--text-small); margin: 12px 0; }
.match-sidebar { margin-top: 28px; }.match-card { padding: 22px 18px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); }.match-card .eyebrow { font-size: var(--text-micro); }.match-card h2 { font-size: var(--text-body); margin-top: 13px; letter-spacing: -.04em; }.score-summary { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin: 26px 0 20px; }.score-summary > div { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; font-size: var(--text-caption); }.score-summary strong { font-family: ui-monospace, monospace; font-size: 27px; font-weight: 500; }.summary-stone { width: 12px; height: 12px; border-radius: 50%; }.summary-stone.black { background: #293d2e; }.summary-stone.white { background: #eeebdf; border: 1px solid #c6cbbb; }.score-colon { color: var(--muted); }.score-bar { height: 5px; background: #e4e5d8; border-radius: 4px; overflow: hidden; }.score-bar span { height: 100%; background: var(--green); display: block; transition: width .4s; }.empty-count { color: var(--muted); font-size: var(--text-caption); margin-top: 14px; text-align: center; }.empty-count strong { color: var(--ink); }.tip-card { position: relative; padding: 25px 18px; margin-top: 18px; border-radius: 16px; background: #eaeedc; }.tip-card .eyebrow { font-size: var(--text-micro); color: var(--muted); margin-top: 10px; }.tip-icon { color: #889e6b; }.tip-card h3 { font-size: var(--text-label); margin: 16px 0 10px; }.tip-card > p:last-child { font-size: var(--text-small); line-height: 1.9; color: var(--muted); }
.confirm-text { color: var(--muted); font-size: var(--text-body); line-height: 1.8; }.confirm-actions { display: flex; gap: 10px; margin-top: 25px; }.confirm-actions button { flex: 1; font-size: var(--text-label); }
@media (max-width: $compact) { .app-shell { padding: 0 28px; }.game-layout { grid-template-columns: minmax(130px, 1fr) minmax(320px, 500px); gap: 28px; }.match-sidebar { display: none; } }
@media (max-width: $mobile) { .app-shell { padding: 0 18px; }.site-header { height: 80px; }.brand-name { font-size: var(--text-body); }.brand-name small { font-size: var(--text-micro); }.brand-mark { width: 31px; }.brand { gap: 10px; }nav { gap: 9px; }.nav-divider { display: none; }.nav-link { padding: 8px; }.nav-link span { display: none; }.sound-button { width: 32px; height: 32px; }.site-footer { margin-top: 24px; font-size: var(--text-caption); }.footer-mark { font-size: var(--text-micro); letter-spacing: .04em; }.game-layout { grid-template-columns: minmax(0, 1fr); padding: 22px 0 15px; max-width: 500px; margin: auto; }.game-story { display: none; }.game-topline { margin-bottom: 12px; } }
</style>
