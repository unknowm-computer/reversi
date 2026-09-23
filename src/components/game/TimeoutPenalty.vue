<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { characterName, otherCharacter, TIMEOUT_PENALTY_MS, type Character } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
interface Props { recipient: Character; paused: boolean; elapsed?: number }
const props = withDefaults(defineProps<Props>(), { elapsed: 0 });
const giver = computed<Character>(() => otherCharacter(props.recipient));
const sceneStyle = computed<CSSProperties>(() => ({
  '--penalty-duration': `${TIMEOUT_PENALTY_MS}ms`,
  '--penalty-delay': `${-props.elapsed}ms`,
}));
</script>
<template>
  <div class="timeout-penalty" :class="{ paused }" :style="sceneStyle" role="status" aria-live="polite" :aria-label="`${characterName(giver)}가 ${characterName(recipient)}에게 ${giver === 'jannabi' ? '주먹으로 꿀밤을' : '바이올린 활로 가볍게 한 대'} 줍니다. 같은 차례로 계속합니다.`">
    <div class="penalty-card">
      <span class="penalty-caption">잠깐, 딴생각했지?</span>
      <div class="bonk-scene" :class="{ 'is-bow': giver === 'grasshopper' }" aria-hidden="true">
        <div class="giver"><CharacterArt :character="giver" bonk /></div>
        <div class="receiver"><CharacterArt :character="recipient" mood="sad" still /></div>
        <span class="impact">✦</span><span class="bonk-word">{{ giver === 'jannabi' ? '콩!' : '톡!' }}</span>
      </div>
      <strong>{{ giver === 'jannabi' ? '꿀밤 한 대, 다시 집중!' : '활로 톡, 다시 집중!' }}</strong>
      <p>같은 차례예요. 시간을 새로 드릴게요.</p>
    </div>
  </div>
</template>
<style scoped lang="scss">
.timeout-penalty { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; border-radius: 15px; background: #193e3266; padding: 12px; }
.penalty-card { width: min(310px, 100%); padding: 18px 12px; border-radius: 20px; background: var(--card); border: 1px solid var(--line); text-align: center; box-shadow: 0 12px 28px #142e3540; }
.penalty-caption { font-size: var(--text-caption); color: var(--muted); }
.bonk-scene { width: min(260px, 100%); aspect-ratio: 440 / 280; margin: 24px auto 6px; position: relative; }
.giver, .receiver { position: absolute; width: 50%; aspect-ratio: 220 / 230; bottom: 12px; transform-origin: 50% 90%; }
.giver { left: 0; z-index: 1; animation: lean-in var(--penalty-duration) var(--penalty-delay) ease-in-out both; }
.is-bow .giver { animation-name: bow-lean-in; }
.receiver { right: 11.8%; animation: recoil var(--penalty-duration) var(--penalty-delay) ease-in-out both; }
.impact, .bonk-word { position: absolute; z-index: 2; animation: impact var(--penalty-duration) var(--penalty-delay) ease both; }
.impact { left: 55%; top: 34%; translate: -50% -50%; color: var(--orange); font-size: 24px; }
.bonk-word { right: 2%; top: 5%; font-size: 24px; font-weight: 800; color: var(--green-dark); transform: rotate(12deg); }
strong { display: block; font-size: 18px; }p { margin-top: 6px; font-size: var(--text-caption); color: var(--muted); }
.paused *, .paused :deep(*) { animation-play-state: paused !important; }
/* Contact, recoil and the sound share the 720 ms mark of the 2.4 s scene. */
@keyframes lean-in {
  0%, 65%, 100% { transform: none; }
  12% { transform: translate(12%, -5%) rotate(-4deg); }
  22% { transform: translate(20.5%, -3%) rotate(-4deg); }
  30% { transform: translateX(20.5%); }
  35% { transform: translate(20.5%, 1%) rotate(2deg); }
  43% { transform: translateX(20.5%); }
  54% { transform: translate(12%, -3%); }
}
@keyframes bow-lean-in {
  0%, 65%, 100% { transform: none; }
  12% { transform: translate(6%, -3%) rotate(-3deg); }
  22% { transform: translateX(12%) rotate(-3deg); }
  30% { transform: translateX(12%); }
  35% { transform: translate(12%, 1%) rotate(2deg); }
  43% { transform: translateX(12%); }
  54% { transform: translate(6%, -2%); }
}
@keyframes recoil {
  0%, 68%, 100% { transform: none; }
  22%, 30% { transform: translateY(4.3%) rotate(-14deg) scaleY(.84); }
  34% { transform: translateY(5.5%) rotate(-17deg) scaleY(.8); }
  43% { transform: translateY(3%) rotate(-10deg) scaleY(.9); }
  52% { transform: translateY(4.3%) rotate(-14deg) scaleY(.84); }
}
@keyframes impact { 0%, 29% { opacity: 0; scale: .3; } 30%, 34% { opacity: 1; scale: 1; } 43%, 100% { opacity: 0; scale: 1.3; } }
.receiver :deep(.character.still .eyes) { transform-box: fill-box; transform-origin: center; animation: flinch var(--penalty-duration) var(--penalty-delay) both; }
@keyframes flinch { 0%, 29%, 50%, 100% { transform: scaleY(1); } 30%, 43% { transform: scaleY(.12); } }
@media (prefers-reduced-motion: reduce) {
  .giver, .receiver { animation: none; }
  .impact, .bonk-word { display: none; }
}
</style>
