<script setup lang="ts">
import SeaChart from './SeaChart.vue';
import { computed, ref, watch } from 'vue';
import { createFleet, SIZE, SUBMARINE_SLOT } from '../../../shared/games/battleship/rules';

interface Props { disabled?: boolean; waiting?: boolean }
interface Drag { pointer: number; start: number; x: number; y: number; target: number; moved: boolean }
const props = defineProps<Props>();
const emit = defineEmits<{ (event: 'confirm', fleet: number[][]): void }>();
const fleet = ref<number[][]>(createFleet());
const grid = ref<HTMLElement | null>(null);
const cursor = ref(0);
const drag = ref<Drag | null>(null);
const notice = ref('');
const locked = computed(() => props.disabled || props.waiting);
watch(locked, () => { drag.value = null; });
const rows = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => y * SIZE + x));
const coordinate = (i: number): string => 'ABCDEFGHIJ'[i % SIZE] + (Math.floor(i / SIZE) + 1);
const owners = computed(() => {
  const map = new Map<number, number>();
  fleet.value.forEach((ship, id) => ship.forEach(cell => map.set(cell, id)));
  return map;
});

function placement(from: number, to: number, rotate = false) {
  const owner = owners.value.get(from);
  if (owner === undefined) return null;
  const ship = fleet.value[owner];
  const offset = ship.indexOf(from);
  const vertical = (ship[1] - ship[0] === SIZE) !== rotate;
  const cells: number[] = [];
  for (let part = 0; part < ship.length; part++) {
    const x = to % SIZE + (vertical ? 0 : part - offset);
    const y = Math.floor(to / SIZE) + (vertical ? part - offset : 0);
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) cells.push(y * SIZE + x);
  }
  const valid = cells.length === ship.length && cells.every(i => !owners.value.has(i) || owners.value.get(i) === owner);
  return { owner, cells, valid };
}
const preview = computed(() => {
  const d = drag.value;
  return d?.moved ? placement(d.start, d.target) : null;
});
const displayedFleet = computed(() => fleet.value.map((ship, index) =>
  preview.value?.owner === index ? preview.value.cells : ship));
function commit(from: number, to: number, rotate = false): boolean {
  const next = placement(from, to, rotate);
  if (!next || locked.value) return false;
  if (next.valid) fleet.value[next.owner] = next.cells;
  notice.value = next.valid ? (next.owner + 1) + '번 함선 ' + coordinate(to) : '함선을 놓을 공간이 부족해요.';
  return next.valid;
}
function dragTarget(event: PointerEvent, start: number): number {
  const first = grid.value!.querySelector<HTMLElement>('[data-cell="0"]')!.getBoundingClientRect();
  const last = grid.value!.querySelector<HTMLElement>(`[data-cell="${SIZE * SIZE - 1}"]`)!.getBoundingClientRect();
  const col = Math.round((event.clientX - first.left - first.width / 2) * (SIZE - 1) / (last.left - first.left));
  const row = Math.round((event.clientY - first.top - first.height / 2) * (SIZE - 1) / (last.top - first.top));
  const ship = fleet.value[owners.value.get(start)!];
  const offset = ship.indexOf(start);
  const tail = ship.length - offset - 1;
  const vertical = ship[1] - ship[0] === SIZE;
  const x = Math.max(vertical ? 0 : offset, Math.min(col, SIZE - 1 - (vertical ? 0 : tail)));
  const y = Math.max(vertical ? offset : 0, Math.min(row, SIZE - 1 - (vertical ? tail : 0)));
  return y * SIZE + x;
}
function begin(event: PointerEvent, i: number): void {
  if (locked.value || drag.value || event.button !== 0 || !event.isPrimary || !owners.value.has(i)) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  drag.value = { pointer: event.pointerId, start: i, x: event.clientX, y: event.clientY, target: i, moved: false };
}
function track(event: PointerEvent): void {
  const d = drag.value;
  if (!d || d.pointer !== event.pointerId) return;
  if (Math.hypot(event.clientX - d.x, event.clientY - d.y) >= 5) d.moved = true;
  if (d.moved) d.target = dragTarget(event, d.start);
}
function end(event: PointerEvent): void {
  const d = drag.value;
  if (!d || d.pointer !== event.pointerId) return;
  track(event);
  if (d.moved) commit(d.start, d.target);
  else commit(d.start, d.start, true);
  drag.value = null;
}
function cancel(event: PointerEvent): void {
  if (drag.value?.pointer === event.pointerId) drag.value = null;
}
function navigate(event: KeyboardEvent, i: number): void {
  const offsets: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const delta = offsets[event.key];
  if (!delta) return;
  event.preventDefault();
  const x = i % SIZE + delta[0], y = Math.floor(i / SIZE) + delta[1];
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const next = y * SIZE + x;
  if (event.shiftKey && !commit(i, next)) return;
  grid.value?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();
}
</script>
<template>
  <fieldset class="fleet-editor" :disabled="locked">
    <legend>내 함대 배치</legend>
    <p class="fleet-editor__hint">끌어서 이동 · 눌러서 회전</p>
    <p class="sr-only">방향키로 칸을 선택하고 Shift와 방향키로 함선을 옮기세요. Enter로 회전합니다.</p>
    <div ref="grid" class="fleet-editor__grid" aria-label="함대 배치 해역"
      @pointermove="track" @pointerup="end" @pointercancel="cancel" @lostpointercapture="cancel">
      <SeaChart class="fleet-editor__chart" :ships="displayedFleet" :submarine-slot="SUBMARINE_SLOT" :moving="preview?.owner" :blocked="preview?.valid === false" />
      <span /><span v-for="letter in 'ABCDEFGHIJ'" :key="letter" aria-hidden="true">{{ letter }}</span>
      <template v-for="(row, y) in rows" :key="y">
        <span aria-hidden="true">{{ y + 1 }}</span>
        <button v-for="i in row" :key="i" type="button" class="fleet-editor__cell" :data-cell="i"
          :class="{ occupied: owners.has(i), moving: drag?.moved && owners.has(i) && owners.get(i) === owners.get(drag.start),
            preview: preview?.cells.includes(i), blocked: preview && !preview.valid && preview.cells.includes(i) }"
          :tabindex="cursor === i ? 0 : -1" @focus="cursor = i" @keydown="navigate($event, i)"
          :aria-label="coordinate(i) + (owners.has(i) ? ' ' + (owners.get(i)! + 1) + (owners.get(i) === SUBMARINE_SLOT ? '번 잠수함' : '번 함선') : ' 빈 바다')"
          @pointerdown="begin($event, i)" @click="$event.detail === 0 && commit(i, i, true)" />
      </template>
    </div>
    <span class="sr-only" role="status">{{ notice }}</span>
    <button type="button" class="primary fleet-editor__confirm" :disabled="!!drag"
      @click="emit('confirm', fleet)">{{ waiting ? '상대의 배치를 기다리는 중…' : '배치 확정' }}</button>
  </fieldset>
</template>
<style scoped lang="scss">
.fleet-editor { min-width: 0; margin: 0; padding: var(--space-3); border: 1px solid var(--line); border-radius: 14px; text-align: center; }
.fleet-editor__confirm { margin: var(--space-3) auto 0; min-height: 44px; padding: var(--space-2) var(--space-4); border-radius: 12px; font-size: var(--text-small); font-weight: 600; }
.fleet-editor legend { font-size: var(--text-label); font-weight: 600; }
.fleet-editor__hint { color: var(--muted); font-size: var(--text-small); margin-bottom: var(--space-2); }
.fleet-editor__grid { display: grid; grid-template-columns: 1.4em repeat(10, minmax(0, 1fr)); align-items: center; font-family: ui-monospace, monospace; font-size: var(--text-caption); position: relative; user-select: none; }
.fleet-editor__chart { grid-area: 2 / 2 / 12 / 12; }
.fleet-editor__cell { position: relative; aspect-ratio: 1; padding: 0; color: #38616b; background: transparent; border-radius: 2px; cursor: default; }
.fleet-editor__cell.occupied { cursor: grab; touch-action: none; }
.fleet-editor__cell.moving { cursor: grabbing; }
.fleet-editor__cell.preview { background: #c8e79033; }
.fleet-editor__cell.blocked { background: #aa493d55; }
</style>
