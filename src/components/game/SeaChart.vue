<script setup lang="ts">
import HitFlame from './HitFlame.vue';
import { computed, useId } from 'vue';
import { SHOT_IMPACT_MS, WRECK_REVEAL_MS } from '../../composables/useBattleshipShots';
import type { Shot } from '../../../shared/game/types';
import { SIZE } from '../../../shared/games/battleship/rules';

interface Props { submarineSlot?: number; surfacing?: number[]; ownFleet?: boolean; ships?: number[][]; shots?: Shot[]; moving?: number; blocked?: boolean }
const props = withDefaults(defineProps<Props>(), { ships: () => [], surfacing: () => [] });
const rising = computed(() => props.ships.map(ship => props.surfacing.find(cell => ship.includes(cell))));
const id = useId();
function hullTransform(ship: number[]): string {
  const start = ship[0];
  return `translate(${(start % SIZE + .5) * 10} ${(Math.floor(start / SIZE) + .5) * 10}) rotate(${ship[1] - start === SIZE ? 90 : 0})`;
}
</script>

<template>
  <svg class="sea-chart" :style="{ '--rise-time': WRECK_REVEAL_MS + 'ms', '--impact-delay': SHOT_IMPACT_MS + 'ms' }" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient :id="id + '-water'" x2=".9" y2="1" gradientUnits="objectBoundingBox">
        <stop stop-color="#d3ebe0" /><stop offset=".4" stop-color="#a8d2cb" /><stop offset="1" stop-color="#79acb2" />
      </linearGradient>
      <pattern :id="id + '-grid'" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 10V0H10" fill="none" stroke="#285a66" stroke-opacity=".38" stroke-width=".23" />
        <circle r=".23" fill="#467783" />
      </pattern>
      <pattern :id="id + '-waves'" width="29" height="21" patternUnits="userSpaceOnUse">
        <path d="M4 7q1-.7 2 0t2 0m11 9q.8-.5 1.6 0t1.6 0" fill="none" stroke="#f2fbec" opacity=".45" stroke-width=".25" stroke-linecap="round" />
      </pattern>
    </defs>
    <rect width="100" height="100" :fill="`url(#${id}-water)`" />
    <g fill="none" stroke="#fcfff0" opacity=".5" stroke-width=".23">
      <path v-for="n in 5" :key="n" :transform="`translate(${-n * 1.45} ${-n * 1.1})`" d="M-8 50C4 45 1 32 12 28S19 13 30 12S42 4 48-5" />
      <path v-for="n in 6" :key="'deep'+n" :transform="`translate(${n * 1.6} ${n * 1.3})`" d="M44 104C48 93 60 98 65 87S63 73 77 68S90 70 93 59S103 50 106 46" />
    </g>
    <rect width="100" height="100" :fill="`url(#${id}-waves)`" />
    <rect width="100" height="100" :fill="`url(#${id}-grid)`" />
    <g v-for="(ship, index) in ships" :key="shots ? ship[0] : index" :transform="hullTransform(ship)" class="sea-chart__ship"
      :class="{ 'is-rising': rising[index] !== undefined, 'is-known': ownFleet, 'is-sunk': shots?.[ship[0]] === 'sunk', 'is-moving': moving === index, 'is-blocked': moving === index && blocked }">
      <g class="sea-chart__body">
      <g v-if="index === submarineSlot" class="sea-chart__submarine" transform="scale(1 1.4)">
        <path d="m-3.45-.45-.3-1.87.85.02 1.48 1.92Zm0 .9-.3 1.87.85-.02 1.48-1.92Z" class="sea-chart__hull" />
        <path d="M-4-.35Q.35-1.68 4.1-1.68h16.1c2.22 0 3.75.7 3.75 1.68s-1.53 1.68-3.75 1.68H4.1Q.35 1.68-4 .35Z"
          class="sea-chart__hull" />
        <path d="M-2.7-.16Q.5-1.18 4.1-1.18h16.1c1.92 0 3.1.48 3.1 1.18s-1.18 1.18-3.1 1.18H4.1Q.5 1.18-2.7 .16Z"
          class="sea-chart__deck" />
        <rect x="10.35" y="-.66" width="4.75" height="1.32" rx=".66" class="sea-chart__hull" />
      </g>
      <g v-else-if="ship.length === 5">
        <path class="sea-chart__hull" d="M-4 -2.7 -2.6 -3.6H10l2.2-.7h10.5l2.6 1.4H43l1 .9v4.2l-1 .9H25l-1.4 .9h-7.2l-2-.8H-2.8L-4 2.4Z" />
        <path class="sea-chart__deck" d="M-3.2 -2.3 -2.2 -2.9H10l2.3-.7h10l2.6 1.4h17.8l.6 .6v3.5l-.6 .5H24.8l-1.4 .9h-6.8l-2-.8H-2.4l-.8-.6Z" />
        <g transform="translate(-2.3 .95) rotate(-7)">
          <rect y="-1.25" width="26" height="2.5" rx=".18" fill="#526973" />
          <path d="M.45 -.96h25.1M.45 .96h25.1" stroke="#abc5bc" stroke-width=".17" />
          <path d="M3 0h21.8" stroke="#f3e8c9" stroke-width=".26" stroke-dasharray="1.3 .9" />
          <path d="M.8 -.55h1.45M.8 0h1.45M.8 .55h1.45" stroke="#f3e8c9" stroke-width=".24" />
        </g>
        <path d="M25 -.9h16.6M25 .55h16.6" stroke="#526973" stroke-width=".25" />
        <g transform="translate(15.7 2.1)">
          <path d="M0 -.55.8 -1h5.8l1.25 .6v1l-1 .8H1L0 .75Z" fill="#354f5c" />
          <rect x="1" y="-.53" width="1.45" height="1.45" rx=".35" fill="#abc5bc" />
          <path d="M3 -.65h2.8l1.1 .5v.64l-.8 .42H3Z" fill="#e5d7af" />
          <path d="M5.7 -.39l.8 .36v.36l-.64 .32" fill="none" stroke="#526973" stroke-width=".24" />
        </g>
      </g>
      <g v-else-if="ship.length === 4">
        <path class="sea-chart__hull" d="M-4 0Q-4 -2.1 -.5 -2.7L5 -3.5H20Q27 -3.3 34 0 27 3.3 20 3.5H5L-.5 2.7Q-4 2.1-4 0Z" />
        <path class="sea-chart__deck" d="M-3 0Q-3 -1.5 0 -2L5 -2.8H20Q26 -2.6 32.3 0 26 2.6 20 2.8H5L0 2Q-3 1.5-3 0Z" />
        <rect x="7" y="-1.9" width="11" height="3.8" rx="1.1" fill="#526973" />
        <rect x="12" y="-1.4" width="4" height="2.8" rx=".6" fill="#f3e8c9" />
        <g v-for="x in [2, 20, 25]" :key="x" :transform="`translate(${x} 0) rotate(${x === 2 ? 180 : 0})`">
          <rect x="-1.3" y="-1.35" width="2.8" height="2.7" rx=".8" fill="#486472" />
          <path d="M1 -.55h3M1 .55h3" stroke="#344a54" stroke-width=".48" />
        </g>
      </g>
      <g v-else-if="ship.length === 3">
        <path class="sea-chart__hull" d="M-4 -1.6 -1.6 -2.4H4l1.4-.7h7.8Q17 -3 24 0 17 3 13.2 3.1H5.4L4 2.4h-5.6L-4 1.6Z" />
        <path class="sea-chart__deck" d="M-3.2 -1.1 -1.4 -1.8H4.3l1.4-.7h7.4Q16.6 -2.4 22.2 0 16.6 2.4 13.1 2.5H5.7l-1.4-.7h-5.7l-1.8-.7Z" />
        <path d="M2 -1.4h8.8L13 0l-2.2 1.4H2Z" fill="#526973" />
        <rect x="8.2" y="-1" width="2.3" height="2" rx=".35" fill="#f3e8c9" />
        <circle cx="16" r="1.05" fill="#486472" />
        <path d="M16 0h3" stroke="#344a54" stroke-width=".65" />
      </g>
      <g v-else>
        <path class="sea-chart__hull" d="M-4 -1.8 -3 -2.4H4Q8 -2.4 14 0 8 2.4 4 2.4H-3L-4 1.8Z" />
        <path class="sea-chart__deck" d="M-3.3 -1.4 -2.8 -1.8H4Q7.7 -1.8 12.2 0 7.7 1.8 4 1.8h-6.8l-.5-.4Z" />
        <rect x="-.8" y="-1.2" width="5.4" height="2.4" rx=".6" fill="#526973" />
        <rect x="2" y="-.85" width="1.8" height="1.7" rx=".3" fill="#f3e8c9" />
        <path d="M7 0h2.6" stroke="#344a54" stroke-width=".7" />
      </g>
      <path class="sea-chart__fracture" v-if="shots?.[ship[0]] === 'sunk'" :transform="`translate(${ship.length * 5 - 5} 0)`"
        d="m1 -2.9-1.5 2 1.1 1-1.7 2.8" fill="none" stroke="#4e302c" stroke-width=".8" />
      </g>
      <g v-if="rising[index] !== undefined">
        <ellipse class="sea-chart__wake" :cx="(ship.length - 1) * 5" cy="0" :rx="ship.length * 4.9" ry="4"
          fill="none" stroke="#e7fff9" stroke-width=".45" />
        <g class="sea-chart__old-hits">
          <g v-for="(cell, part) in ship" :key="cell" :transform="`translate(${part * 10} 0)`">
            <g v-if="cell !== rising[index]">
              <HitFlame :x="ownFleet ? -3.75 : -3" :y="ownFleet ? -3.75 : -3"
                :width="ownFleet ? 7.5 : 6" :height="ownFleet ? 7.5 : 6" />
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped lang="scss">
.sea-chart { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; border-radius: 5px; }
.sea-chart__ship { filter: drop-shadow(0 .35px .28px #153b4680); }
.sea-chart__hull { fill: #354f5c; }
.sea-chart__deck { fill: #abc5bc; }
.is-sunk .sea-chart__hull { fill: #873e30; }
.is-sunk .sea-chart__deck { fill: #cb9074; }
.is-moving .sea-chart__hull { fill: #246345; }
.is-blocked .sea-chart__hull { fill: #973e32; }
.is-rising:not(.is-known) .sea-chart__body {
  transform-box: fill-box; transform-origin: center;
  animation: surface-hull var(--rise-time) ease-out both;
}
.is-rising.is-known .sea-chart__fracture { animation: clear-hits .75s ease-in var(--impact-delay) reverse both; }
.is-rising.is-known .sea-chart__hull { animation: weather-hull var(--rise-time) ease both; }
.is-rising.is-known .sea-chart__deck { animation: weather-deck var(--rise-time) ease both; }
.sea-chart__old-hits { animation: clear-hits .48s ease-out var(--impact-delay) both; }
.sea-chart__wake { transform-box: fill-box; transform-origin: center; animation: surface-wake var(--rise-time) ease-out both; }
@keyframes surface-hull {
  0%, 20% { opacity: 0; transform: translateY(1.3px) scale(.94, .65); filter: blur(.45px); }
  50% { opacity: .55; }
  82% { transform: translateY(-.22px) scale(1, 1); }
  100% { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes surface-wake {
  0%, 23% { opacity: 0; transform: scale(.82, .44); }
  43% { opacity: .9; }
  100% { opacity: 0; transform: scale(1.05, 1.65); }
}
@keyframes clear-hits { from { opacity: 1; } to { opacity: 0; } }
@keyframes weather-hull { 0%, 20% { fill: #354f5c; } 100% { fill: #873e30; } }
@keyframes weather-deck { 0%, 20% { fill: #abc5bc; } 100% { fill: #cb9074; } }
</style>
