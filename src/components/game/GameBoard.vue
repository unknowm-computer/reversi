<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGamepad } from '../../composables/useGamepad';
import AppIcon from '../common/AppIcon.vue';
import type { Cell, Color } from '../../../shared/game/types';
interface Props { board: Cell[]; legal: number[]; turn: Color; interactive: boolean; lastMove: number | null; flipped: number[]; revision: number; hintIndex?: number | null }
const props = withDefaults(defineProps<Props>(), { hintIndex: null });
const emit = defineEmits<{ (event: 'move', index: number): void }>();
const grid = ref<HTMLElement | null>(null);
const focusIndex = ref(19);
const moves = computed(() => new Set(props.legal));
const suggestion = computed<number | null>(() => props.hintIndex !== null && moves.value.has(props.hintIndex) ? props.hintIndex : null);
const hintMessage = computed<string>(() => suggestion.value === null ? '' : `힌트: ${'ABCDEFGH'[suggestion.value % 8]}${Math.floor(suggestion.value / 8) + 1}에 놓아보세요.`);
function label(index: number): string {
  return `${'ABCDEFGH'[index % 8]}${Math.floor(index / 8) + 1}, ${props.board[index] === 'black' ? '흑돌' : props.board[index] === 'white' ? '백돌' : '빈칸'}${moves.value.has(index) ? ', 착수 가능' : ''}${props.lastMove === index ? ', 마지막 착수' : ''}${suggestion.value === index ? ', 힌트 추천' : ''}`;
}
const pad = useGamepad(computed(() => props.interactive), {
  direction: direction => moveFocus(direction, focusIndex.value),
  confirm: () => {
    focusCell();
    if (props.interactive && moves.value.has(focusIndex.value)) emit('move', focusIndex.value);
  },
});
const padMessage = computed(() => ({
  waiting: '조이패드를 연결하고 버튼을 눌러 인식시켜 주세요.',
  connected: '조이패드 연결됨 · 십자키 / 왼쪽 스틱 이동 · 아래 버튼(A / ×) 착수',
  unsupported: '이 조이패드는 표준 버튼 배치를 지원하지 않아요. 키보드나 터치를 사용해 주세요.',
  unavailable: '이 환경에서는 조이패드를 사용할 수 없어요. 키보드나 터치를 사용해 주세요.',
})[pad.status.value]);
function focusCell(): void {
  grid.value?.querySelector<HTMLButtonElement>(`[data-cell="${focusIndex.value}"]`)?.focus({ preventScroll: true });
}
function moveFocus(key: string, index: number): boolean {
  const row = Math.floor(index / 8), col = index % 8;
  const targets: Record<string, number> = { ArrowLeft: row * 8 + (col + 7) % 8, ArrowRight: row * 8 + (col + 1) % 8, ArrowUp: ((row + 7) % 8) * 8 + col, ArrowDown: ((row + 1) % 8) * 8 + col, Home: row * 8, End: row * 8 + 7 };
  if (!(key in targets)) return false;
  focusIndex.value = targets[key];
  focusCell();
  return true;
}
function navigate(event: KeyboardEvent, index: number): void {
  if (moveFocus(event.key, index)) event.preventDefault();
}
</script>
<template>
  <div class="board-input">
  <div class="board-frame">
    <div class="coordinates top" aria-hidden="true"><span v-for="letter in 'ABCDEFGH'" :key="letter">{{ letter }}</span></div>
    <div class="coordinates side" aria-hidden="true"><span v-for="n in 8" :key="n">{{ n }}</span></div>
    <div ref="grid" class="board" role="group" aria-label="리버시 보드. 방향키로 이동하고 Enter 또는 Space로 착수하세요.">
      <button v-for="(cell, index) in board" :key="index" type="button" class="cell" :class="{ legal: moves.has(index), playable: interactive && moves.has(index), last: lastMove === index, 'pad-cursor': pad.active.value && interactive && focusIndex === index }" :data-cell="index" :data-legal="moves.has(index)" :aria-label="label(index)" :aria-disabled="!interactive || !moves.has(index)" :tabindex="focusIndex === index ? 0 : -1" @focus="focusIndex = index" @keydown="navigate($event, index)" @click="interactive && moves.has(index) && emit('move', index)">
        <span v-if="cell" :key="`${index}-${flipped.includes(index) ? revision : 0}`" class="disc" :class="[cell, { flip: flipped.includes(index), placed: lastMove === index }]" :style="{ '--flip-delay': `${Math.max(0, flipped.indexOf(index)) * 14}ms` }"><span v-if="lastMove === index" class="last-dot" /></span>
        <span v-else-if="suggestion === index" class="suggestion-marker" aria-hidden="true"><AppIcon name="hint" /></span>
        <span v-else-if="moves.has(index)" class="hint"><span /></span>
        <span v-if="[18,21,42,45].includes(index)" class="board-star" />
      </button>
    </div>
    <div class="board-label" aria-hidden="true">JANNABI & GRASSHOPPER · REVERSI CLUB</div>
  </div>
  <p class="sr-only" role="status">{{ padMessage }}</p>
  <p class="sr-only" role="status" aria-live="polite">{{ hintMessage }}</p>
  </div>
</template>
<style scoped lang="scss">
.cell.pad-cursor { outline: 3px solid #ffe4a1; outline-offset: -4px; z-index: 2; background: #e9d69725; }
.board-frame { position: relative; padding: 27px 17px 25px 27px; background: #315548; border: 1px solid #214237; border-radius: 15px; box-shadow: 0 5px 0 #213e32, 0 14px 26px #243e3217; width: 100%; }
.board { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); aspect-ratio: 1; border: 1px solid #1b3d32; border-radius: 3px; background: #47765b; }
.cell { display: grid; place-items: center; aspect-ratio: 1; position: relative; border-right: 1px solid #274f3e8c; border-bottom: 1px solid #274f3e8c; min-width: 0; perspective: 500px; }
.cell:nth-child(8n) { border-right: 0; }
.cell:nth-child(n+57) { border-bottom: 0; }
.cell.playable:hover { background: #bdd49b25; }
.cell:focus-visible { outline-offset: -4px; outline-color: #e9d697; z-index: 2; }
.disc { width: 79%; height: 79%; border-radius: 50%; position: relative; z-index: 1; backface-visibility: visible; }
.disc.black { background: radial-gradient(circle at 35% 25%, #4b5148, #202923 57%, #18251f 85%); box-shadow: inset 0 1px 1px #ffffff24, 0 3px 0 #101e18, 0 5px 5px #12251d66; }
.disc.white { background: radial-gradient(circle at 36% 26%, #fffdf1, #ece9da 70%, #c6c8b6); box-shadow: inset 0 1px 2px white, 0 3px 0 #b3b7a4, 0 5px 5px #12251d66; }
.disc.flip { animation: flip .42s ease both; animation-delay: var(--flip-delay); }
.disc.placed:not(.flip) { animation: place .3s ease-out; }
.last-dot { position: absolute; width: 12%; height: 12%; border-radius: 50%; background: #caa864; top: 44%; left: 44%; }
.hint { width: 77%; height: 77%; display: grid; place-items: center; border-radius: 50%; border: 1px solid #ccdd9b38; }
.hint span { width: 15%; height: 15%; border-radius: 50%; background: #d1e3a37a; }
.playable:hover .hint { background: #e7edd039; border-color: #e6edc7; }
.suggestion-marker { width: 77%; height: 77%; display: grid; place-items: center; border: 2px solid var(--hint-gold); border-radius: 50%; color: var(--hint-ink); background: var(--hint-soft); box-shadow: 0 0 0 3px #f1cd7826; }
.suggestion-marker svg { width: 62%; height: 62%; }
.board-star { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #254d3a; right: -3px; bottom: -3px; }
.coordinates { position: absolute; display: grid; color: var(--board-text); font-family: ui-monospace, monospace; font-size: var(--text-caption); text-align: center; }
.top { grid-template-columns: repeat(8, 1fr); top: 5px; left: 27px; right: 17px; }
.side { grid-template-rows: repeat(8, 1fr); top: 27px; bottom: 25px; left: 10px; align-items: center; }
.board-label { position: absolute; bottom: 5px; left: 0; width: 100%; text-align: center; color: var(--board-text); font-family: ui-monospace, monospace; font-size: var(--text-micro); letter-spacing: .04em; }
@keyframes flip { 0% { transform: rotateY(180deg) scale(.9); filter: brightness(.7); } 100% { transform: rotateY(0); } }
@keyframes place { from { transform: translateY(-9px) scale(.85); opacity: .4; } }
</style>
