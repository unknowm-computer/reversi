<script setup lang="ts">
import CharacterArt from './CharacterArt.vue';
import { characterName, type Character } from '../../../shared/game/types';
import { IMPACT_MS } from '../../composables/useMoveImpact';

interface Props { character: Character }
defineProps<Props>();
</script>

<template>
  <div class="dance" role="status" :style="{ '--duration': IMPACT_MS + 'ms' }">
    <span class="sr-only">{{ characterName(character) }}의 축하 댄스!</span>
    <div class="dance__figure"><CharacterArt :character="character" mood="dance" /></div>
  </div>
</template>

<style scoped lang="scss">
.dance {
  position: absolute; inset: 0; z-index: 3; display: grid; place-items: center;
  pointer-events: none; border-radius: 15px;
  background: radial-gradient(ellipse at center, #fff2ba75, transparent 62%);
  animation: spotlight var(--duration) ease both;
}
.dance__figure { width: min(48%, 270px); aspect-ratio: 220 / 230; transform-origin: 50% 88%; animation: steps var(--duration) ease-in-out both; }
@keyframes spotlight { 0%, 100% { opacity: 0; } 8%, 90% { opacity: 1; } }
@keyframes steps {
  0% { transform: translateY(12%) scale(.76); }
  14% { transform: translate(-20%, -18%) rotate(-15deg); }
  24% { transform: translateX(-24%) scale(1.08, .92); }
  38% { transform: translate(19%, -21%) rotate(16deg); }
  48% { transform: translateX(23%) scale(1.08, .92); }
  59% { transform: translate(8%, -12%) rotateY(90deg); }
  70% { transform: translate(-10%, -24%) rotateY(270deg) rotate(-12deg); }
  80% { transform: translateX(-10%) rotateY(360deg) scale(1.08, .92); }
  91% { transform: translateY(-13%) rotateY(360deg) rotate(8deg); }
  100% { transform: rotateY(360deg); }
}
@media (prefers-reduced-motion: reduce) { .dance, .dance__figure { animation: none; } }
</style>
