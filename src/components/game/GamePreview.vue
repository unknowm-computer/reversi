<script setup lang="ts">
import type { GameType } from '../../../shared/game/types';
import PieceArt from './PieceArt.vue';
interface Props { gameType: GameType }
defineProps<Props>();
</script>
<template>
  <div class="game-preview" :class="gameType" aria-hidden="true">
    <svg v-if="gameType === 'reversi' || gameType === 'gomoku'" viewBox="0 0 60 60">
      <template v-if="gameType === 'reversi'"><path d="M20 5V55 M40 5V55 M5 20H55 M5 40H55" /><circle cx="20" cy="20" r="7" class="black" /><circle cx="40" cy="20" r="7" class="white" /><circle cx="20" cy="40" r="7" class="white" /><circle cx="40" cy="40" r="7" class="black" /></template>
      <template v-else><path d="M10 10H50 M10 20H50 M10 30H50 M10 40H50 M10 50H50 M10 10V50 M20 10V50 M30 10V50 M40 10V50 M50 10V50" /><circle v-for="n in 3" :key="n" :cx="n * 10 + 10" :cy="n * 10 + 10" r="4.7" class="black" /><circle cx="30" cy="20" r="4.7" class="white" /><circle cx="40" cy="30" r="4.7" class="white" /></template>
    </svg>
    <PieceArt v-else :game-type="gameType" :piece="{ color: 'black', kind: gameType === 'chess' ? 'knight' : 'general' }" />
  </div>
</template>
<style scoped lang="scss">
.game-preview { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; border-radius: 7px; background: #55795b; }
.game-preview > svg { width: 100%; height: 100%; }
path { stroke: #35593f; stroke-width: .8; fill: none; }
.gomoku, .janggi { background: #e4bf80; }
.gomoku path { stroke: #976f40; }
.black { fill: #26382d; }.white { fill: #fcf5df; stroke: #c9bfa3; stroke-width: .7; }
.chess { background: conic-gradient(#76927c 25%, #e9e5d5 0 50%, #76927c 0 75%, #e9e5d5 0) 0 0 / 50% 50%; }
.chess > svg, .janggi > svg { width: 85%; height: 85%; }
</style>
