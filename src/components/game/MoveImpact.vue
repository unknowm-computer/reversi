<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { characterName, otherCharacter, type Character } from '../../../shared/game/types';
import { IMPACT_MS } from '../../composables/useMoveImpact';
import CharacterArt from './CharacterArt.vue';
interface Props { actor: Character; kind: 'capture'; count: number }
defineProps<Props>();
const sceneStyle: CSSProperties = { '--taunt-duration': `${IMPACT_MS}ms` };
</script>
<template>
  <div class="move-impact" role="status" :style="sceneStyle" :aria-label="`한 번에 ${count}개! ${characterName(actor)}가 입꼬리를 당기며 메롱하고, ${characterName(otherCharacter(actor))}는 삐친 표정을 지어요.`">
    <div class="impact-banner">
      <strong>{{ `한 번에 ${count}개!` }}</strong>
      <div class="taunt-scene" aria-hidden="true">
        <div class="teaser"><span class="speech teasing">메~롱!</span><div class="figure"><CharacterArt :character="actor" taunt /></div></div>
        <div class="rival"><span class="speech sulking">두고 봐~</span><div class="figure"><CharacterArt :character="otherCharacter(actor)" mood="annoyed" pose="consider" /></div></div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.move-impact { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; border-radius: 15px; background: #193e3255; pointer-events: none; }
.impact-banner { width: min(300px, 90%); padding: 18px 14px 10px; border-radius: 20px; background: var(--card); box-shadow: 0 8px 25px #193e3244; text-align: center; animation: arrive .15s ease-out; }
strong { font-size: 20px; color: var(--green-dark); }
.taunt-scene { display: flex; justify-content: space-between; gap: 8px; max-width: 255px; margin: 16px auto 0; }
.teaser, .rival { display: flex; flex-direction: column; align-items: center; width: 48%; }
.figure { width: 100%; aspect-ratio: 220 / 230; }
.speech { position: relative; padding: 6px 10px; border-radius: 12px; font-size: var(--text-small); font-weight: 750; white-space: nowrap; }
.speech::after { content: ''; position: absolute; bottom: -4px; left: 45%; width: 8px; height: 8px; background: inherit; transform: rotate(45deg); }
.teasing { color: var(--green-dark); background: #e9edcf; animation: tease-bubble var(--taunt-duration) ease-out both; }
.sulking { color: var(--muted); background: #eeece4; animation: sulk-bubble var(--taunt-duration) ease-out both; }
.rival .figure { transform-origin: 50% 90%; animation: sulk var(--taunt-duration) ease-in-out both; }
@keyframes arrive { from { opacity: 0; transform: scale(.94); } }
@keyframes tease-bubble { 0%, 8% { opacity: 0; transform: translateY(3px) scale(.9); } 25%, 100% { opacity: 1; transform: none; } }
@keyframes sulk-bubble { 0%, 32% { opacity: 0; transform: translateY(3px); } 48%, 100% { opacity: 1; transform: none; } }
@keyframes sulk { 0%, 28% { transform: none; } 46% { transform: rotate(5deg); } 65%, 100% { transform: rotate(3deg); } }
@media (prefers-reduced-motion: reduce) { .impact-banner, .speech, .rival .figure { animation: none; } }
</style>
