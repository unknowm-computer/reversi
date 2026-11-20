<script setup lang="ts">
import HitFlame from './HitFlame.vue';
import MissMark from './MissMark.vue';
import ShotEffect from './ShotEffect.vue';
import SeaChart from './SeaChart.vue';
import { computed } from 'vue';
import type { Shot } from '../../../shared/game/types';
import { SIZE, SUBMARINE_SLOT } from '../../../shared/games/battleship/rules';

interface Props { surfacing?: number[]; shotIndex?: number | null; ships: number[][]; incoming: Shot[] }
const props = defineProps<Props>();
const occupied = computed(() => new Set(props.ships.flat()));
const hits = computed(() => props.incoming.filter(shot => shot === 'hit' || shot === 'sunk').length);
const labels = { hit: '명중', miss: '빗나감', sunk: '격침' };
const coordinate = (i: number): string => 'ABCDEFGHIJ'[i % SIZE] + (Math.floor(i / SIZE) + 1);
</script>

<template>
  <section class="fleet-map" aria-label="내 함대">
    <h2>내 함대</h2>
    <div class="fleet-map__grid" role="img" :aria-label="`내 함대 배치와 상대 사격 기록, 피격 ${hits}칸`">
      <SeaChart :ships="ships" :submarine-slot="SUBMARINE_SLOT" :shots="incoming" :surfacing="surfacing" own-fleet />
      <span v-for="(shot, i) in incoming" :key="i" class="fleet-map__tile"
        :class="[shot, { ship: occupied.has(i) }]"
        :title="coordinate(i) + ' ' + (shot ? labels[shot] : ships[SUBMARINE_SLOT]?.includes(i) ? '내 잠수함' : occupied.has(i) ? '내 함선' : '바다')">
        <ShotEffect v-if="(shotIndex === i || surfacing?.includes(i)) && shot" :outcome="shot!" />
        <MissMark v-else-if="shot === 'miss'" />
        <HitFlame v-else-if="shot === 'hit'" />
      </span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.fleet-map { margin-top: var(--space-4); padding: var(--space-4); border-radius: 16px; background: #244a54; color: white; }
.fleet-map h2 { font-size: var(--text-label); margin-bottom: var(--space-3); }
.fleet-map__grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); position: relative; max-width: 220px; margin-inline: auto; }
.fleet-map__tile { position: relative; display: grid; place-items: center; aspect-ratio: 1; background: transparent; color: #254d57; font-size: var(--text-caption); font-weight: 600; line-height: 1; }
.fleet-map__tile .hit-flame { width: 75%; }
.fleet-map__tile.miss { background: #15547821; }
</style>
