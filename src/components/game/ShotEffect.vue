<script setup lang="ts">
import type { Shot } from '../../../shared/game/types';
import { SHOT_EFFECT_MS } from '../../composables/useBattleshipShots';
interface Props { outcome: NonNullable<Shot> }
defineProps<Props>();
</script>
<template>
  <svg class="shot-effect" :class="outcome" :style="{ '--shot-time': SHOT_EFFECT_MS + 'ms' }"
    viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g class="shot-effect__drop">
      <path d="M46 39v-13m7 13V19" fill="none" stroke="#fff7cf" stroke-width="3" stroke-linecap="round" />
      <path d="m50 44-8-8 2 13 6 2 6-2 2-13Z" fill="#d29a59" stroke="#314951" stroke-width="2" />
      <ellipse cx="50" cy="54" rx="8" ry="12" fill="#344f59" stroke="#faf2d4" stroke-width="2" />
      <path d="M46 51q0-3 2-4" fill="none" stroke="#a6c6bb" stroke-width="2" stroke-linecap="round" />
    </g>
    <g class="shot-effect__impact">
      <template v-if="outcome === 'miss'">
        <ellipse cx="50" cy="54" rx="26" ry="12" fill="none" stroke="#e4fffa" stroke-width="3" />
        <path d="m32 50-6-9m16 5-4-15m14 13 4-18m6 23 8-12" stroke="#f5fffc" stroke-width="4" stroke-linecap="round" />
        <ellipse cx="50" cy="55" rx="15" ry="5" fill="none" stroke="#397f88" stroke-width="2" />
      </template>
      <template v-else>
        <circle v-if="outcome === 'sunk'" cx="50" cy="50" r="34" fill="none" stroke="#fcdf91" stroke-width="3" />
        <path d="m50 19 5 18 16-10-7 16 18 6-18 7 9 17-19-10-6 19-5-19-18 8 10-17-17-6 19-6-7-18 16 12Z"
          fill="#efa353" stroke="#984d39" stroke-width="2" />
        <path d="m50 34 4 10 10-3-6 9 7 7-12-2-4 11-3-11-11 2 7-8-6-8 11 4Z" fill="#fff4bb" />
      </template>
    </g>
  </svg>
</template>
<style scoped lang="scss">
.shot-effect { position: absolute; inset: -30%; width: 160%; height: 160%; z-index: 1; pointer-events: none; overflow: visible; }
.shot-effect__drop { animation: shot-drop var(--shot-time) linear both; }
.shot-effect__impact { transform-origin: 50% 52%; animation: shot-impact var(--shot-time) ease-out both; }
@keyframes shot-drop {
  0% { opacity: 0; transform: translateY(-68%); }
  10% { opacity: 1; }
  38% { opacity: 1; transform: translateY(-5%); }
  39%, 100% { opacity: 0; }
}
@keyframes shot-impact {
  0%, 37% { opacity: 0; transform: scale(.18); }
  40% { opacity: 1; }
  65% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.35); }
}
@media (prefers-reduced-motion: reduce) {
  .shot-effect { display: none; }
}
</style>
