<script setup lang="ts">
import { otherCharacter, type Character } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
interface Props { actor: Character; kind: 'capture'; count: number }
defineProps<Props>();
</script>
<template>
  <div class="move-impact" role="status">
    <div class="impact-banner">
      <strong>{{ `한 번에 ${count}개!` }}</strong>
      <div class="impact-scene" aria-hidden="true">
        <div class="attacker"><CharacterArt :character="actor" mood="happy" /></div>
        <div class="defender"><CharacterArt :character="otherCharacter(actor)" mood="sad" /></div>
        <span class="fist">👊</span><span class="stars">✦ ✧</span><span class="hit-word">콩!</span>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.move-impact { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; border-radius: 15px; background: #193e3255; pointer-events: none; }
.impact-banner { width: min(300px, 90%); padding: 14px; border-radius: 20px; background: var(--card); box-shadow: 0 8px 25px #193e3244; text-align: center; animation: arrive .15s ease-out; }
strong { font-size: 20px; color: var(--green-dark); }
.impact-scene { position: relative; height: 145px; max-width: 245px; margin: 10px auto 0; }
.attacker, .defender { position: absolute; bottom: 0; width: 110px; height: 125px; }
.attacker { left: 0; animation: lunge .7s both; }.defender { right: 0; transform-origin: 50% 85%; animation: recoil .7s both; }
.fist { position: absolute; top: 20px; left: 40%; font-size: 46px; animation: punch .7s both; }
.stars { position: absolute; right: 8px; top: 5px; color: var(--orange); font-size: 34px; animation: stars .7s both; }
.hit-word { position: absolute; top: 0; left: 52%; font-size: 25px; font-weight: 800; color: var(--green-dark); animation: stars .7s both; }
@keyframes arrive { from { opacity: 0; transform: scale(.9); } }
@keyframes lunge { 0%, 25% { transform: translateX(-10px) rotate(-8deg); } 60%, 100% { transform: translateX(12px) rotate(12deg); } }
@keyframes punch { 0%, 25% { transform: translate(-25px, -15px) rotate(-25deg); } 65%, 100% { transform: translate(28px, 20px) rotate(15deg); } }
@keyframes recoil { 0%, 58% { transform: none; } 72% { transform: translate(12px, 6px) rotate(16deg) scaleY(.85); } 100% { transform: translateX(5px) rotate(-8deg); } }
@keyframes stars { 0%, 58% { opacity: 0; transform: scale(.3); } 80%, 100% { opacity: 1; transform: scale(1.15); } }
@media (prefers-reduced-motion: reduce) { .impact-banner, .attacker, .defender, .fist, .stars, .hit-word { animation: none; } }
</style>
