<script setup lang="ts">
import HitFlame from './HitFlame.vue';
import MissMark from './MissMark.vue';
import ShotEffect from './ShotEffect.vue';
import SeaChart from './SeaChart.vue';
import { computed, ref, watch } from 'vue';
import { opposite } from '../../../shared/game/state';
import type { Color, GameState } from '../../../shared/game/types';
import { SIZE, SUBMARINE_SLOT, sunkShips } from '../../../shared/games/battleship/rules';
import { useGamepad, type PadDirection } from '../../composables/useGamepad';

interface Props { surfacing?: number[]; shotIndex?: number | null; state: GameState; perspective: Color; interactive: boolean; hintIndex: number | null }
const props = defineProps<Props>();
const emit = defineEmits<{ (event: 'move', index: number): void }>();

const grid = ref<HTMLElement | null>(null);
const cursor = ref(0);
const sea = computed(() => props.state.battleship!);
const shots = computed(() => sea.value.shots[props.perspective]);
const defender = computed(() => opposite(props.perspective));
const visibleShips = computed(() => props.state.result ? sea.value.fleets[defender.value] : sunkShips(sea.value, props.perspective));
const submarineSlot = computed(() => props.state.result ? SUBMARINE_SLOT
  : visibleShips.value.findIndex(ship => ship[0] === sea.value.sunkSubmarines?.[defender.value]));
const revealedCells = computed(() => new Set(props.state.result ? visibleShips.value.flat() : []));
const labels = { hit: '명중', miss: '빗나감', sunk: '격침' };
const letters = 'ABCDEFGHIJ';
const coordinate = (i: number): string => letters[i % SIZE] + (Math.floor(i / SIZE) + 1);
const canFire = computed(() => props.interactive && props.state.turn === props.perspective);
const lastShot = computed(() => {
  const i = props.state.lastMove;
  if (i === null) return '';
  const actor = opposite(props.state.turn);
  const shot = sea.value.shots[actor][i];
  return shot ? [actor === props.perspective ? '내 사격' : '상대 사격', coordinate(i), labels[shot]].join(' · ') : '';
});
watch(() => props.state.gameId, () => { cursor.value = 0; });
function fire(index: number): void {
  if (canFire.value && shots.value[index] === null) emit('move', index);
}
function navigate(key: PadDirection): void {
  const x = cursor.value % SIZE, y = Math.floor(cursor.value / SIZE);
  const dx = Number(key === 'ArrowRight') - Number(key === 'ArrowLeft');
  const dy = Number(key === 'ArrowDown') - Number(key === 'ArrowUp');
  cursor.value = ((y + dy + SIZE) % SIZE) * SIZE + (x + dx + SIZE) % SIZE;
  grid.value?.querySelector<HTMLButtonElement>(`[data-cell="${cursor.value}"]`)?.focus({ preventScroll: true });
}
const pad = useGamepad(canFire, { direction: navigate, confirm: () => fire(cursor.value) });
</script>
<template>
  <section class="sea" aria-label="배틀쉽 상대 해역">
    <p class="sea__status" role="status">{{ lastShot || '함대 다섯 척이 배치됐어요.' }} · {{ state.result ? '사격 종료' : state.turn === perspective ? '내 사격 차례' : '상대 차례' }}</p>
    <div ref="grid" class="sea__grid">
      <SeaChart class="sea__chart" :ships="visibleShips" :submarine-slot="submarineSlot" :shots="shots" :surfacing="surfacing" />
      <span /><span v-for="letter in letters" :key="letter" class="sea__axis">{{ letter }}</span>
      <template v-for="row in SIZE" :key="row">
        <span class="sea__axis">{{ row }}</span>
        <button v-for="i in Array.from({ length: SIZE }, (_, x) => (row - 1) * SIZE + x)" :key="i" type="button"
          class="sea__cell" :class="[shots[i], { hinted: hintIndex === i, aimed: pad.active.value && cursor === i }]"
          :data-cell="i" :tabindex="cursor === i ? 0 : -1" :aria-disabled="!canFire || shots[i] !== null"
          :aria-label="[coordinate(i), shots[i] ? labels[shots[i]!] : revealedCells.has(i) ? '생존 함선' : '미탐색'].join(' ')"
          @focus="cursor = i" @keydown.left.prevent="navigate('ArrowLeft')" @keydown.right.prevent="navigate('ArrowRight')"
          @keydown.up.prevent="navigate('ArrowUp')" @keydown.down.prevent="navigate('ArrowDown')" @click="fire(i)">
          <ShotEffect v-if="(shotIndex === i || surfacing?.includes(i)) && shots[i]" :outcome="shots[i]!" />
          <MissMark v-else-if="shots[i] === 'miss'" />
          <HitFlame v-else-if="shots[i] === 'hit'" />
          <span v-else-if="hintIndex === i" class="sea__mark">◎</span>
        </button>
      </template>
    </div>
    <p class="sea__legend"><MissMark /> 빗나감　<HitFlame /> 명중　붉은 선체 격침<template v-if="state.result">　회청색 선체 생존</template></p>
  </section>
</template>
<style scoped lang="scss">
.sea { padding: var(--space-3); border-radius: 16px; background: #244a54; color: #fff; }
.sea__status, .sea__legend { margin: var(--space-2) 0; text-align: center; font-size: var(--text-small); }
.sea__grid { display: grid; grid-template-columns: 1.4em repeat(10, minmax(0, 1fr)); position: relative; }
.sea__axis { font-family: ui-monospace, monospace; align-self: center; text-align: center; font-size: var(--text-caption); }
.sea__chart { grid-area: 2 / 2 / 12 / 12; }
.sea__cell { position: relative; aspect-ratio: 1; display: grid; place-items: center; padding: 0; border-radius: 2px; background: transparent; color: #254d57; font-size: var(--text-body); font-weight: 600; line-height: 1; }
.sea__mark { display: grid; place-items: center; border-radius: 50%; width: 58%; aspect-ratio: 1; }
.sea__cell.miss { background: #15547821; }
.sea__legend .miss-mark, .sea__legend .hit-flame { width: 1em; vertical-align: middle; }
.sea__cell .hit-flame { width: 60%; }
.sea__cell.hinted, .sea__cell.aimed, .sea__cell:focus-visible { outline: 3px solid #c9810d; outline-offset: -3px; }
.sea__cell[aria-disabled='false']:hover { background: #f3f8eb50; }
</style>
