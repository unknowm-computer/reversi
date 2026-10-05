<script setup lang="ts">
import { computed } from 'vue';
import type { Character, Color, GameType, Reaction } from '../../../shared/game/types';
import { characterName, sideName, isPieceGame, TURN_WARNING_MS } from '../../../shared/game/types';
import AppIcon from '../common/AppIcon.vue';
import CharacterAvatar from '../common/CharacterAvatar.vue';
interface Props {
  gameType?: GameType;
  character: Character;
  color: Color;
  count: number;
  active: boolean;
  mood: Reaction;
  remaining: number;
  seconds: number;
  undoCount: number | '∞';
  showActions?: boolean;
  canUndo?: boolean;
  canResign?: boolean;
  showHint?: boolean;
  canHint?: boolean;
  hintBusy?: boolean;
  hintActive?: boolean;
  canPass?: boolean;
  passSuggested?: boolean;
  bikjang?: boolean;
}
const props = withDefaults(defineProps<Props>(), { gameType: 'reversi', showActions: false, canUndo: false, canResign: false, showHint: false, canHint: false, hintBusy: false, hintActive: false, canPass: false, passSuggested: false, bikjang: false });
const hintLabel = computed<string>(() => props.hintBusy ? '힌트 계산 취소' : props.hintActive ? '힌트 숨기기' : '힌트 보기 (무제한)');
const displaySide = computed<string>(() => sideName(props.gameType, props.color));
const markerColor = computed<string>(() => props.gameType === 'chess' ? (props.color === 'black' ? 'white' : 'black') : props.gameType === 'janggi' ? (props.color === 'black' ? 'cho' : 'han') : props.color);
const emit = defineEmits<{ (event: 'undo'): void; (event: 'resign'): void; (event: 'hint'): void; (event: 'pass'): void }>();
</script>
<template>
  <section class="player-panel" :class="{ active, 'with-actions': showActions, 'with-hint': showActions && showHint }" :aria-label="`${characterName(character)} ${displaySide}, ${count}${gameType === 'gomoku' ? '번 착수' : isPieceGame(gameType) ? '개 기물' : '개'}`">
    <div class="player-layout">
      <CharacterAvatar class="avatar" :character="character" :mood="mood">
        <span v-if="active" class="turn-indicator" role="img" :aria-label="`${characterName(character)} · ${displaySide}의 차례`" title="현재 차례"><AppIcon name="turn" /></span>
      </CharacterAvatar>
      <h2 class="player-info">{{ characterName(character) }}<span class="stone-tag" :class="markerColor" /><span class="color-text">{{ displaySide }}</span></h2>
      <div v-if="active && seconds" class="timer" :class="{ urgent: remaining <= TURN_WARNING_MS }" :aria-label="`남은 시간 ${Math.ceil(remaining / 1000)}초`">
        <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="track" /><circle cx="20" cy="20" r="17" class="progress" :style="{ strokeDashoffset: 107 * (1 - Math.min(1, remaining / (seconds * 1000))) }" /></svg>
        <span>{{ Math.ceil(remaining / 1000) }}</span>
      </div>
      <div class="score"><strong>{{ String(count).padStart(2, '0') }}</strong><span>{{ gameType === 'gomoku' ? '번의 착수' : isPieceGame(gameType) ? '남은 기물' : '개의 돌' }}</span></div>
      <div v-if="showActions" class="player-actions">
        <button v-if="showHint" class="secondary hint-action" :disabled="!canHint" :aria-busy="hintBusy" :aria-pressed="hintActive || hintBusy" :aria-label="hintLabel" :title="hintLabel" @click="emit('hint')"><AppIcon name="hint" />힌트</button>
        <button v-if="gameType === 'janggi'" type="button" class="secondary pass-action" :class="{ suggested: passSuggested && canPass }" :disabled="!canPass" @click="canPass && emit('pass')"><AppIcon name="arrow" />{{ bikjang ? '빅장 수락' : '쉬기' }}</button>
        <button class="secondary" :disabled="!canUndo" :aria-label="`무르기 (${undoCount === '∞' ? '무제한' : `${undoCount}회 남음`})`" @click="emit('undo')"><AppIcon name="undo" />무르기 ({{ undoCount }})</button>
        <button class="secondary resign-action" :disabled="!canResign" @click="emit('resign')"><AppIcon name="flag" />기권</button>
      </div>
    </div>
  </section>
</template>
<style scoped lang="scss">
@use '../../styles/tokens' as *;
.player-panel {
  container-type: inline-size;
  padding: var(--space-2);
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #faf8f1;
  transition: background .3s, border-color .3s;
}
.player-layout {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 34px minmax(52px, max-content);
  // Reserve both rows even while actions are hidden to keep the board in place.
  grid-template-rows: 46px 36px;
  align-items: center;
  gap: var(--space-2);
}
.player-panel.active { background: #eef1e0; border-color: #a9b78b; }
.avatar { grid-column: 1; grid-row: 1; width: 46px; height: 46px; }
.turn-indicator { position: absolute; top: -3px; right: -3px; display: grid; place-items: center; width: 22px; height: 22px; color: var(--card); background: var(--green); border: 2px solid var(--card); border-radius: 50%; }
.turn-indicator svg { width: 11px; height: 11px; fill: currentColor; }
.player-info { grid-column: 2; grid-row: 1; display: flex; align-items: center; gap: var(--space-1); min-width: 0; font-size: var(--text-body); letter-spacing: -.03em; white-space: nowrap; }
.stone-tag { height: 10px; width: 10px; border-radius: 50%; margin-left: 2px; flex-shrink: 0; }
.stone-tag.black { background: #27392e; }
.stone-tag.white { background: #fffdf1; border: 1px solid #c1c5b2; }
.stone-tag.cho { background: #326a91; }
.stone-tag.han { background: #b44f42; }
.color-text { font-size: var(--text-caption); font-weight: 400; color: var(--muted); }
.score { grid-column: 4; grid-row: 1; text-align: right; min-width: 0; }
.score strong { font-family: ui-monospace, monospace; font-size: 26px; font-weight: 500; letter-spacing: -.07em; line-height: 1; }
.score > span { display: block; font-size: var(--text-caption); color: var(--muted); margin-top: 1px; white-space: nowrap; }
.timer { grid-column: 3; grid-row: 1; width: 34px; height: 34px; position: relative; color: var(--text-accent); }
.timer svg { width: 100%; transform: rotate(-90deg); }
.timer circle { fill: none; stroke-width: 2px; }
.track { stroke: #dce2cc; }
.progress { stroke: currentColor; stroke-dasharray: 107; transition: stroke-dashoffset .1s; }
.timer > span { position: absolute; inset: 0; display: grid; place-items: center; font-size: var(--text-small); font-family: ui-monospace, monospace; }
.timer.urgent { color: var(--danger); }
.player-actions { grid-column: 1 / -1; grid-row: 2; display: flex; align-items: center; justify-content: flex-end; gap: var(--space-1); }
.player-actions button { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-1); height: 36px; min-height: 36px; padding: var(--space-1) calc(var(--space-1) * 1.5); border-radius: 9px; font-size: var(--text-caption); white-space: nowrap; transition: background .2s, border-color .2s; }
.player-actions button:hover:not(:disabled) { border-color: var(--text-accent); background: var(--paper); }
.player-actions .resign-action { color: var(--danger); background: var(--danger-soft); border-color: var(--danger-line); font-weight: 500; }
.player-actions .resign-action:hover:not(:disabled) { border-color: var(--danger); background: var(--danger-soft); }
.player-actions .hint-action { color: var(--hint-ink); border-color: var(--hint-gold); background: var(--hint-soft); }
.player-actions .hint-action:hover:not(:disabled) { border-color: var(--hint-ink); background: var(--hint-soft); }
.player-actions .hint-action[aria-pressed="true"], .player-actions .hint-action[aria-pressed="true"]:hover:not(:disabled) { color: var(--hint-soft); border-color: var(--hint-ink); background: var(--hint-ink); }
.player-actions .pass-action.suggested { border-color: var(--hint-gold); background: var(--hint-soft); }
.hint-action[aria-busy="true"] svg { animation: hint-thinking .7s ease-in-out infinite alternate; }
.player-actions svg { width: 13px; height: 13px; flex-shrink: 0; }
@keyframes hint-thinking { to { opacity: .35; } }
@container (min-width: #{$player-panel-wide}) {
  .player-layout { grid-template-columns: 52px minmax(0, 1fr) auto 34px minmax(52px, max-content); grid-template-rows: 52px; }
  .avatar { width: 52px; height: 52px; }
  .player-actions { grid-column: 3; grid-row: 1; }
  .timer { grid-column: 4; }
  .score { grid-column: 5; }
}
</style>
