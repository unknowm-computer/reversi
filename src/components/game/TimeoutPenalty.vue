<script setup lang="ts">
import type { Character } from '../../../shared/game/types';
import { characterName, otherCharacter } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
interface Props { recipient: Character; paused: boolean }
defineProps<Props>();
</script>
<template>
  <div class="timeout-penalty" :class="{ paused }" role="status" aria-live="polite" :aria-label="`${characterName(recipient)} 시간 초과! 꿀밤 한 대 후 같은 차례로 계속합니다.`">
    <div class="penalty-card">
      <span class="penalty-caption">잠깐, 딴생각했지?</span>
      <div class="bonk-scene" aria-hidden="true">
        <div class="giver"><CharacterArt :character="otherCharacter(recipient)" mood="happy" /></div>
        <div class="receiver"><CharacterArt :character="recipient" mood="sad" /></div>
        <svg class="bonk-hand" viewBox="0 0 90 90"><path d="M8 80 17 48 24 42V22q1-13 11-9l3 17V15q5-11 13-1l3 17V22q7-9 13 1l3 17q13-5 14 5l-4 21-25 19Z" fill="#ecc899" stroke="#674c36" stroke-width="3" stroke-linejoin="round"/><path d="m24 42 35-1q14 5 1 15l-17 2m-6-28 2 12m15-11 2 10m14-1-2 10" fill="none" stroke="#674c36" stroke-width="3" stroke-linecap="round"/></svg>
        <span class="impact">✦</span><span class="bonk-word">콩!</span>
      </div>
      <strong>꿀밤 한 대, 다시 집중!</strong>
      <p>같은 차례예요. 시간을 새로 드릴게요.</p>
    </div>
  </div>
</template>
<style scoped lang="scss">
.timeout-penalty { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; border-radius: 15px; background: #193e3266; padding: 12px; }
.penalty-card { width: min(310px, 100%); padding: 18px 12px; border-radius: 20px; background: var(--card); border: 1px solid var(--line); text-align: center; box-shadow: 0 12px 28px #142e3540; }
.penalty-caption { font-size: var(--text-caption); color: var(--muted); }
.bonk-scene { width: min(240px, 100%); height: 133px; margin: 24px auto 6px; position: relative; }
.giver, .receiver { position: absolute; width: 116px; height: 128px; bottom: 0; }
.giver { left: 0; transform: rotate(10deg); }.receiver { right: 0; transform-origin: 50% 90%; animation: recoil 2.4s ease both; }
.bonk-hand { position: absolute; width: 55px; height: 55px; left: 45%; top: -4px; transform-origin: bottom left; animation: bonk 2.4s ease both; }
.impact { position: absolute; right: 19%; top: 9px; color: var(--orange); font-size: 42px; animation: impact 2.4s ease both; }
.bonk-word { position: absolute; right: 1%; top: -4px; font-size: 24px; font-weight: 800; color: var(--green-dark); transform: rotate(12deg); animation: impact 2.4s ease both; }
strong { display: block; font-size: 18px; }p { margin-top: 6px; font-size: var(--text-caption); color: var(--muted); }
.paused *, .paused :deep(*) { animation-play-state: paused !important; }
@keyframes bonk { 0%, 12% { transform: translate(-22px, -20px) rotate(-35deg); } 24%, 35% { transform: translate(30px, 30px) rotate(15deg); } 50%, 100% { transform: translate(-8px, -15px) rotate(-20deg); } }
@keyframes recoil { 0%, 23% { transform: rotate(0); } 28% { transform: translateY(12px) rotate(12deg); } 37% { transform: rotate(-8deg); } 48%, 100% { transform: rotate(0); } }
@keyframes impact { 0%, 23% { opacity: 0; scale: .3; } 28%, 48% { opacity: 1; scale: 1; } 80%, 100% { opacity: 0; scale: 1.2; } }
</style>
