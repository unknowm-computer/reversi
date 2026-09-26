<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { characterName, TIMEOUT_PENALTY_MS, type Character } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
interface Props { recipient: Character; paused: boolean; elapsed?: number }
const props = withDefaults(defineProps<Props>(), { elapsed: 0 });
const sceneStyle = computed<CSSProperties>(() => ({
  '--penalty-duration': `${TIMEOUT_PENALTY_MS}ms`,
  '--penalty-delay': `${-props.elapsed}ms`,
}));
</script>
<template>
  <div class="timeout-penalty" :class="{ paused }" :style="sceneStyle" role="status" aria-live="polite" :aria-label="`${characterName(recipient)}가 꿀밤을 한 대 맞고 다시 집중합니다. 같은 차례로 계속합니다.`">
    <div class="penalty-card">
      <span class="penalty-caption">잠깐, 딴생각했지?</span>
      <div class="bonk-scene" aria-hidden="true">
        <div class="receiver" :class="recipient"><CharacterArt :character="recipient" mood="sad" still /></div>
        <svg class="bonk-fist" viewBox="0 0 100 110" fill="none" stroke="#80604a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M29-12H72l3 41q12 2 12 15v26q1 12-9 16-4 11-13 6-8 9-17 2-11 5-18-6-11-2-12-14l-2-22Q7 39 17 33q7-3 13 4Z" fill="#f6dfb8" />
          <path d="M30 37q7 6 9 14m38-4H43q-10 0-10 8t10 8h13M39 70v17m14-15v18m13-18v16" />
          <path d="M29 14h43" stroke="#d5b58c" />
          <path d="M39-4h22" stroke="#fff2d6" stroke-width="6" />
        </svg>
        <svg class="impact" viewBox="0 0 100 70" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round">
          <path d="m50 25 6 12 15-3-8 12 9 12-16-2-7 11-5-13-15 1 10-11-7-12 15 3Z" fill="#fff1ad" stroke-width="2.5" />
          <path d="m15 17 9 11m59-11-9 11M8 43l13 2m72-3-13 3" />
        </svg>
        <span class="bonk-word">콩!</span>
        <span class="dizzy-stars">✧　✦　✧</span>
      </div>
      <strong>꿀밤 한 대, 다시 집중!</strong>
      <p>같은 차례예요. 시간을 새로 드릴게요.</p>
    </div>
  </div>
</template>
<style scoped lang="scss">
@use '../../styles/tokens' as *;
.timeout-penalty { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; border-radius: 15px; background: #193e3266; padding: 12px; }
.penalty-card { width: min(310px, 100%); padding: 18px 12px; border-radius: 20px; background: var(--card); border: 1px solid var(--line); text-align: center; box-shadow: 0 12px 28px #142e3540; }
.penalty-caption { font-size: var(--text-caption); color: var(--muted); }
/* Crop the entering wrist at the top, while keeping the recipient fully in view. */
.bonk-scene { width: min(260px, 100%); aspect-ratio: 26 / 21; margin: 8px auto 6px; position: relative; overflow: hidden; }
.receiver { position: absolute; width: 62%; aspect-ratio: 220 / 230; bottom: 0; left: 19%; transform-origin: 50% 90%; animation: recoil var(--penalty-duration) var(--penalty-delay) both; }
.receiver.grasshopper { bottom: 6%; }
.bonk-fist { position: absolute; width: 28%; left: 36%; top: -10%; overflow: visible; animation: knuckle-tap var(--penalty-duration) var(--penalty-delay) both; }
.impact, .bonk-word { position: absolute; animation: impact var(--penalty-duration) var(--penalty-delay) both; }
.impact { width: 30%; left: 35%; top: 10%; color: var(--orange); }
.bonk-word { right: 10%; top: 13%; font-size: 27px; font-weight: 800; color: var(--green-dark); rotate: 12deg; }
.dizzy-stars { position: absolute; width: 56%; left: 22%; top: 15%; color: #c99a47; font-size: 23px; animation: seeing-stars var(--penalty-duration) var(--penalty-delay) both; }
strong { display: block; font-size: 18px; }p { margin-top: 6px; font-size: var(--text-caption); color: var(--muted); }
.paused *, .paused :deep(*) { animation-play-state: paused !important; }
/* One contact at 30% (720 ms), synchronized with the existing sound and timer. */
@keyframes knuckle-tap {
  0% { opacity: 0; transform: translateY(-80%) rotate(-8deg); }
  10% { opacity: 1; transform: translateY(-42%) rotate(-8deg); }
  22% { opacity: 1; transform: translateY(-65%) rotate(-8deg); animation-timing-function: cubic-bezier(.6, 0, 1, .5); }
  30% { opacity: 1; transform: translateY(8%); }
  34% { opacity: 1; transform: translateY(46%) rotate(3deg); animation-timing-function: ease-out; }
  43% { opacity: 1; transform: translateY(-38%) rotate(-8deg); }
  55%, 100% { opacity: 0; transform: translateY(-95%) rotate(-8deg); }
}
@keyframes recoil {
  0%, 29.9% { transform: none; }
  34% { transform: translateY(4%) scale(1.06, .83); animation-timing-function: ease-out; }
  43% { transform: translateY(-2%) rotate(-6deg) scale(.98, 1.02); }
  53% { transform: rotate(5deg); }
  64% { transform: rotate(-3deg); }
  78%, 100% { transform: none; }
}
@keyframes impact {
  0%, 29.9% { opacity: 0; scale: .4; transform: translateY(0); }
  30% { opacity: 1; scale: 1; transform: translateY(0); }
  34% { opacity: 1; scale: 1; transform: translateY(45%); }
  44%, 100% { opacity: 0; scale: 1.2; transform: translateY(15%); }
}
@keyframes seeing-stars { 0%, 42% { opacity: 0; transform: rotate(-10deg); } 48% { opacity: 1; } 58% { transform: rotate(8deg); } 70% { opacity: .8; transform: rotate(-6deg); } 82%, 100% { opacity: 0; transform: translateY(-5px); } }
.receiver :deep(.character.still .eyes) { transform-box: fill-box; transform-origin: center; animation: flinch var(--penalty-duration) var(--penalty-delay) both; }
@keyframes flinch { 0%, 29.9%, 68%, 100% { transform: scaleY(1); } 30%, 48% { transform: scaleY(.12); } }
@media (max-width: $mobile) {
  .penalty-card { padding: 12px; }
  .penalty-caption { display: block; }
  .bonk-scene { width: min(260px, 64vw, 100%); margin-block: 6px 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .receiver, .receiver :deep(.eyes) { animation: none; }
  .bonk-fist, .impact, .bonk-word, .dizzy-stars { display: none; }
}
</style>
