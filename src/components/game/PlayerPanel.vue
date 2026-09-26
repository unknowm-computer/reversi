<script setup lang="ts">
import { useId } from 'vue';
import type { Character, Color, Reaction } from '../../../shared/game/types';
import { characterName, TURN_WARNING_MS } from '../../../shared/game/types';
import AppIcon from '../common/AppIcon.vue';
import CharacterArt from './CharacterArt.vue';
interface Props {
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
}
withDefaults(defineProps<Props>(), { showActions: false, canUndo: false, canResign: false, showHint: false, canHint: false, hintBusy: false });
const emit = defineEmits<{ (event: 'undo'): void; (event: 'resign'): void; (event: 'hint'): void }>();
const portraitClipId = useId();
</script>
<template>
  <section class="player-panel" :class="{ active, 'with-actions': showActions, 'with-hint': showActions && showHint }" :aria-label="`${characterName(character)} ${color === 'black' ? '흑' : '백'}, ${count}개`">
    <div class="avatar">
      <svg v-if="character === 'grasshopper'" class="portrait-clip" aria-hidden="true" width="0" height="0">
        <defs>
          <clipPath :id="portraitClipId" clipPathUnits="objectBoundingBox">
            <circle cx=".5" cy=".5" r=".5" />
            <!-- Open the top of the circular crop so the moving antennae remain visible. -->
            <rect x="-.15" y="-.25" width="1.3" height=".75" />
          </clipPath>
        </defs>
      </svg>
      <div class="avatar-crop" :class="{ 'with-antennae': character === 'grasshopper' }" :style="character === 'grasshopper' ? { clipPath: `url(#${portraitClipId})` } : undefined"><CharacterArt :character="character" :mood="mood" portrait /></div>
      <span v-if="active" class="turn-indicator" role="img" :aria-label="`${characterName(character)} · ${color === 'black' ? '흑' : '백'}의 차례`" title="현재 차례"><AppIcon name="turn" /></span>
    </div>
    <h2 class="player-info">{{ characterName(character) }}<span class="stone-tag" :class="color" /><span class="color-text">{{ color === 'black' ? '흑' : '백' }}</span></h2>
    <div v-if="active && seconds" class="timer" :class="{ urgent: remaining <= TURN_WARNING_MS }" :aria-label="`남은 시간 ${Math.ceil(remaining / 1000)}초`">
      <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="track" /><circle cx="20" cy="20" r="17" class="progress" :style="{ strokeDashoffset: 107 * (1 - Math.min(1, remaining / (seconds * 1000))) }" /></svg>
      <span>{{ Math.ceil(remaining / 1000) }}</span>
    </div>
    <div class="score"><strong>{{ String(count).padStart(2, '0') }}</strong><span>개의 돌</span></div>
    <div v-if="showActions" class="player-actions">
      <button v-if="showHint" class="secondary hint-action" :disabled="!canHint || hintBusy" :aria-busy="hintBusy" :aria-label="hintBusy ? '힌트를 찾는 중' : '힌트 보기 (무제한)'" title="추천할 칸 보기 · 무제한" @click="emit('hint')"><AppIcon name="hint" />힌트</button>
      <button class="secondary" :disabled="!canUndo" :aria-label="`한 수 무르기 (${undoCount === '∞' ? '무제한' : `${undoCount}회 남음`})`" @click="emit('undo')"><AppIcon name="undo" />한 수 무르기 ({{ undoCount }})</button>
      <button class="secondary resign-action" :disabled="!canResign" @click="emit('resign')"><AppIcon name="flag" />기권하기</button>
    </div>
  </section>
</template>
<style scoped lang="scss">
@use '../../styles/tokens' as *;
.player-panel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  grid-template-rows: 41px 36px;
  align-items: center;
  column-gap: var(--space-3);
  row-gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #faf8f1;
  transition: background .3s, border-color .3s;
}
.player-panel.active { background: #eef1e0; border-color: #a9b78b; }
.avatar { grid-column: 1; grid-row: 1 / 3; position: relative; width: 85px; height: 85px; }
.avatar-crop { width: 100%; height: 100%; background: #e9e9dc; border-radius: 50%; overflow: hidden; }
.portrait-clip { position: absolute; }
.avatar-crop.with-antennae { overflow: visible; }
.turn-indicator { position: absolute; top: -3px; right: -3px; display: grid; place-items: center; width: 27px; height: 27px; color: var(--card); background: var(--green); border: 2px solid var(--card); border-radius: 50%; }
.turn-indicator svg { width: 14px; height: 14px; fill: currentColor; }
.player-info { grid-column: 2; grid-row: 1 / 3; display: flex; align-items: center; gap: 7px; min-width: 0; font-size: 19px; letter-spacing: -.03em; white-space: nowrap; }
.stone-tag { height: 11px; width: 11px; border-radius: 50%; margin-left: 2px; flex-shrink: 0; }
.stone-tag.black { background: #27392e; }
.stone-tag.white { background: #fffdf1; border: 1px solid #c1c5b2; }
.color-text { font-size: var(--text-caption); font-weight: 400; color: var(--muted); }
.score { grid-column: 4; grid-row: 1 / 3; text-align: right; min-width: 42px; }
.score strong { font-family: ui-monospace, monospace; font-size: 33px; font-weight: 500; letter-spacing: -.07em; }
.score > span { display: block; font-size: var(--text-caption); color: var(--muted); margin-top: 1px; }
.timer { grid-column: 3; grid-row: 1 / 3; width: 39px; height: 39px; position: relative; color: var(--text-accent); }
.timer svg { width: 100%; transform: rotate(-90deg); }
.timer circle { fill: none; stroke-width: 2px; }
.track { stroke: #dce2cc; }
.progress { stroke: currentColor; stroke-dasharray: 107; transition: stroke-dashoffset .1s; }
.timer > span { position: absolute; inset: 0; display: grid; place-items: center; font-size: var(--text-small); font-family: ui-monospace, monospace; }
.timer.urgent { color: var(--danger); }
.with-actions .player-info, .with-actions .timer { grid-row: 1; }
.player-actions { grid-column: 2 / 4; grid-row: 2; display: flex; align-items: center; gap: var(--space-2); }
.player-actions button { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-1); height: 36px; min-height: 36px; padding: var(--space-1) var(--space-2); border-radius: 9px; font-size: var(--text-caption); white-space: nowrap; transition: background .2s, border-color .2s; }
.player-actions button:hover:not(:disabled) { border-color: var(--text-accent); background: var(--paper); }
.player-actions .resign-action { color: var(--danger); background: var(--danger-soft); border-color: var(--danger-line); font-weight: 500; }
.player-actions .resign-action:hover:not(:disabled) { border-color: var(--danger); background: var(--danger-soft); }
.with-hint .score { grid-row: 1; }
.with-hint .player-actions { grid-column-end: -1; gap: var(--space-1); }
.with-hint .player-actions button { padding-inline: calc(var(--space-1) * 1.5); }
.player-actions .hint-action { color: var(--hint-ink); border-color: var(--hint-gold); background: var(--hint-soft); }
.player-actions .hint-action:hover:not(:disabled) { border-color: var(--hint-ink); background: var(--hint-soft); }
.hint-action[aria-busy="true"] svg { animation: hint-thinking .7s ease-in-out infinite alternate; }
.player-actions svg { width: 13px; height: 13px; flex-shrink: 0; }
@keyframes hint-thinking { to { opacity: .35; } }
@media (max-width: $mobile) {
  .player-panel { grid-template-rows: 65px 36px; column-gap: var(--space-2); padding: var(--space-3); }
  .avatar { width: 65px; height: 65px; }
  .turn-indicator { width: 24px; height: 24px; }
  .player-info { gap: var(--space-1); font-size: 18px; }
  .timer { width: 34px; height: 34px; }
  .score { min-width: 35px; }
  .score strong { font-size: 29px; }
  .with-actions .avatar, .with-actions .score { grid-row: 1; }
  .player-actions { grid-column: 1 / -1; }
}
</style>
