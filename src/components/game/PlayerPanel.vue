<script setup lang="ts">
import type { Character, Color, Reaction } from '../../../shared/game/types';
import { characterName } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
interface Props { character: Character; color: Color; count: number; active: boolean; label: string; mood: Reaction; remaining: number; seconds: number; undoText?: string }
defineProps<Props>();
</script>
<template><section class="player-panel" :class="{ active }" :aria-label="`${characterName(character)} ${color === 'black' ? '흑' : '백'}, ${count}개`"><div class="avatar"><CharacterArt :character="character" :mood="mood" portrait /></div><div class="player-info"><span class="player-label">{{ label }}<span v-if="active" class="turn-tag">생각 중</span></span><h2>{{ characterName(character) }}<span class="stone-tag" :class="color" /><span class="color-text">{{ color === 'black' ? '흑' : '백' }}</span></h2><span v-if="undoText" class="undo-count">무르기 {{ undoText }}</span></div><div v-if="active && seconds" class="timer" :class="{ urgent: remaining <= 5000 }" :aria-label="`남은 시간 ${Math.ceil(remaining / 1000)}초`"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="track" /><circle cx="20" cy="20" r="17" class="progress" :style="{ strokeDashoffset: 107 * (1 - Math.min(1, remaining / (seconds * 1000))) }" /></svg><span>{{ Math.ceil(remaining / 1000) }}</span></div><div class="score"><strong>{{ String(count).padStart(2, '0') }}</strong><span>개의 돌</span></div></section></template>
<style scoped lang="scss">
@use '../../styles/tokens' as *;
.player-panel { display: flex; align-items: center; gap: 13px; padding: 12px 16px; border: 1px solid var(--line); border-radius: 16px; background: #faf8f1; transition: background .3s, border-color .3s; min-height: 91px; }
.player-panel.active { background: #eef1e0; border-color: #a9b78b; }.avatar { width: 65px; height: 65px; flex-shrink: 0; background: #e9e9dc; border-radius: 50%; overflow: hidden; }.player-info { flex: 1; min-width: 0; }.player-label { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: var(--text-caption); color: var(--muted); margin-bottom: 6px; }.turn-tag { color: var(--text-accent); font-size: var(--text-caption); }h2 { display: flex; align-items: center; gap: 7px; font-size: 19px; letter-spacing: -.03em; }.stone-tag { height: 11px; width: 11px; border-radius: 50%; margin-left: 2px; }.stone-tag.black { background: #27392e; }.stone-tag.white { background: #fffdf1; border: 1px solid #c1c5b2; }.color-text { font-size: var(--text-caption); font-weight: 400; color: var(--muted); }.score { text-align: right; min-width: 42px; }.score strong { font-family: ui-monospace, monospace; font-size: 33px; font-weight: 500; letter-spacing: -.07em; }.score > span { display: block; font-size: var(--text-caption); color: var(--muted); margin-top: 1px; }.undo-count { color: var(--muted); font-size: var(--text-caption); margin-top: 5px; display: block; }
.timer { flex-shrink: 0; width: 39px; height: 39px; position: relative; color: var(--text-accent); margin-right: 10px; }.timer svg { width: 100%; transform: rotate(-90deg); }.timer circle { fill: none; stroke-width: 2px; }.track { stroke: #dce2cc; }.progress { stroke: currentColor; stroke-dasharray: 107; transition: stroke-dashoffset .1s; }.timer > span { position: absolute; inset: 0; display: grid; place-items: center; font-size: var(--text-small); font-family: ui-monospace, monospace; }.timer.urgent { color: var(--danger); }
@media (max-width: $mobile) {
  .player-panel { gap: 8px; padding: 12px; }
  .avatar { width: 50px; height: 50px; }
  .player-label { gap: 3px 6px; }
  h2 { gap: 4px; font-size: 18px; }
  .timer { width: 34px; height: 34px; margin-right: 0; }
  .score { min-width: 35px; }
  .score strong { font-size: 29px; }
}
</style>
