<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Cell, Color } from '../../../shared/game/types';
import { GOMOKU_COLUMNS, GOMOKU_SIZE, gomokuCoordinate } from '../../../shared/games/gomoku/board';
import { getForbiddenMoveReason } from '../../../shared/games/gomoku/rules';
import { useGamepad } from '../../composables/useGamepad';
import AppIcon from '../common/AppIcon.vue';

interface Props {
  board: Cell[];
  turn: Color;
  interactive: boolean;
  lastMove: number | null;
  winningLine: number[];
  hintIndex?: number | null;
}

const props = withDefaults(defineProps<Props>(), { hintIndex: null });
const emit = defineEmits<{ (event: 'move', index: number): void }>();
const grid = ref<HTMLElement | null>(null);
const focusIndex = ref<number>(Math.floor(GOMOKU_SIZE * GOMOKU_SIZE / 2));
const winners = computed<Set<number>>(() => new Set(props.winningLine));
type ForbiddenReason = NonNullable<ReturnType<typeof getForbiddenMoveReason>>;
const forbiddenLabels: Record<ForbiddenReason, string> = {
  doubleThree: '3-3 금수',
  doubleFour: '4-4 금수',
  overline: '장목 금수(6목 이상)',
};
const forbidden = computed<Map<number, ForbiddenReason>>(() => {
  const reasons = new Map<number, ForbiddenReason>();
  if (!props.interactive) return reasons;
  props.board.forEach((cell, index) => {
    if (cell !== null) return;
    const reason = getForbiddenMoveReason(props.board, index, props.turn);
    if (reason) reasons.set(index, reason);
  });
  return reasons;
});
const suggestion = computed<number | null>(() => props.hintIndex !== null && props.board[props.hintIndex] === null
  && !getForbiddenMoveReason(props.board, props.hintIndex, props.turn) ? props.hintIndex : null);
const hintMessage = computed<string>(() => suggestion.value === null ? '' : `힌트: ${gomokuCoordinate(suggestion.value)} 교차점에 놓아보세요.`);
const victoryPoints = computed<string>(() => props.winningLine.map(index => `${index % GOMOKU_SIZE + .5},${Math.floor(index / GOMOKU_SIZE) + .5}`).join(' '));
const starPoints = new Set<number>([3 * GOMOKU_SIZE + 3, 3 * GOMOKU_SIZE + 11, 7 * GOMOKU_SIZE + 7, 11 * GOMOKU_SIZE + 3, 11 * GOMOKU_SIZE + 11]);

function label(index: number): string {
  const color = props.board[index] === 'black' ? '흑돌' : props.board[index] === 'white' ? '백돌' : '빈 교차점';
  const reason = forbidden.value.get(index);
  return `${gomokuCoordinate(index)}, ${color}${reason ? `, ${forbiddenLabels[reason]}, 착수 불가` : canPlace(index) ? ', 착수 가능' : ''}${props.lastMove === index ? ', 마지막 착수' : ''}${suggestion.value === index ? ', 힌트 추천' : ''}${winners.value.has(index) ? ', 승리 연결선' : ''}`;
}

function canPlace(index: number): boolean {
  return props.interactive && props.board[index] === null && !forbidden.value.has(index);
}

function place(index: number): void {
  if (canPlace(index)) emit('move', index);
}

function focusCell(): void {
  grid.value?.querySelector<HTMLButtonElement>(`[data-cell="${focusIndex.value}"]`)?.focus({ preventScroll: true });
}

function moveFocus(key: string, index: number): boolean {
  const row = Math.floor(index / GOMOKU_SIZE), col = index % GOMOKU_SIZE;
  const targets: Record<string, number> = {
    ArrowLeft: row * GOMOKU_SIZE + (col + GOMOKU_SIZE - 1) % GOMOKU_SIZE,
    ArrowRight: row * GOMOKU_SIZE + (col + 1) % GOMOKU_SIZE,
    ArrowUp: ((row + GOMOKU_SIZE - 1) % GOMOKU_SIZE) * GOMOKU_SIZE + col,
    ArrowDown: ((row + 1) % GOMOKU_SIZE) * GOMOKU_SIZE + col,
    Home: row * GOMOKU_SIZE,
    End: row * GOMOKU_SIZE + GOMOKU_SIZE - 1,
  };
  if (!(key in targets)) return false;
  focusIndex.value = targets[key];
  focusCell();
  return true;
}

function navigate(event: KeyboardEvent, index: number): void {
  if (moveFocus(event.key, index)) event.preventDefault();
}

const pad = useGamepad(computed<boolean>(() => props.interactive), {
  direction: direction => moveFocus(direction, focusIndex.value),
  confirm: () => { focusCell(); place(focusIndex.value); },
});
const padMessage = computed<string>(() => ({
  waiting: '조이패드를 연결하고 버튼을 눌러 인식시켜 주세요.',
  connected: '조이패드 연결됨 · 십자키 / 왼쪽 스틱 이동 · 아래 버튼(A / ×) 착수',
  unsupported: '이 조이패드는 표준 버튼 배치를 지원하지 않아요. 키보드나 터치를 사용해 주세요.',
  unavailable: '이 환경에서는 조이패드를 사용할 수 없어요. 키보드나 터치를 사용해 주세요.',
})[pad.status.value]);
</script>

<template>
  <div class="gomoku-input" :style="{ '--board-size': GOMOKU_SIZE }">
    <div class="board-frame">
      <div class="coordinates top" aria-hidden="true"><span v-for="letter in GOMOKU_COLUMNS" :key="letter">{{ letter }}</span></div>
      <div class="coordinates side" aria-hidden="true"><span v-for="n in GOMOKU_SIZE" :key="n">{{ n }}</span></div>
      <div ref="grid" class="board" :class="`turn-${turn}`" role="group" aria-label="오목 보드, 15×15 교차점. 방향키로 이동하고 Enter 또는 Space로 착수하세요.">
        <button
          v-for="(cell, index) in board"
          :key="index"
          type="button"
          class="intersection"
          :class="{
            'first-column': index % GOMOKU_SIZE === 0,
            'last-column': (index + 1) % GOMOKU_SIZE === 0,
            'first-row': index < GOMOKU_SIZE,
            'last-row': index >= GOMOKU_SIZE * (GOMOKU_SIZE - 1),
            playable: canPlace(index),
            forbidden: forbidden.has(index),
            winning: winners.has(index),
            'pad-cursor': pad.active.value && interactive && focusIndex === index,
          }"
          :data-cell="index"
          :aria-label="label(index)"
          :title="forbidden.has(index) ? forbiddenLabels[forbidden.get(index)!] : undefined"
          :aria-disabled="!canPlace(index)"
          :tabindex="focusIndex === index ? 0 : -1"
          @focus="focusIndex = index"
          @keydown="navigate($event, index)"
          @click="place(index)"
        >
          <span v-if="starPoints.has(index)" class="board-star" aria-hidden="true" />
          <span v-if="cell" class="disc" :class="[cell, { placed: lastMove === index }]" aria-hidden="true"><span v-if="lastMove === index" class="last-dot" /></span>
          <span v-else-if="forbidden.has(index)" class="forbidden-marker" aria-hidden="true" />
          <span v-else-if="suggestion === index" class="suggestion-marker" aria-hidden="true"><AppIcon name="hint" /></span>
          <span v-else class="hover-stone" aria-hidden="true" />
        </button>
        <svg v-if="winningLine.length > 1" class="victory-line" :viewBox="`0 0 ${GOMOKU_SIZE} ${GOMOKU_SIZE}`" aria-hidden="true"><polyline :points="victoryPoints" /></svg>
      </div>
      <div class="board-label" aria-hidden="true">JANNABI & GRASSHOPPER · GOMOKU CLUB</div>
    </div>
    <p class="sr-only" role="status">{{ padMessage }}</p>
    <p class="sr-only" role="status" aria-live="polite">{{ hintMessage }}</p>
  </div>
</template>

<style scoped lang="scss">
.gomoku-input { min-width: 0; }
.board-frame { position: relative; padding: 25px 10px 25px 24px; width: 100%; border: 1px solid #a17d4c; border-radius: 15px; background: #d6ae72; box-shadow: 0 5px 0 #a97c46, 0 14px 26px #63472917; }
.board { position: relative; display: grid; grid-template-columns: repeat(var(--board-size), minmax(0, 1fr)); aspect-ratio: 1; border-radius: 5px; background: repeating-linear-gradient(3deg, transparent 0 9px, #af7e3910 10px, transparent 11px 24px), #e9c88f; }
.intersection { position: relative; display: grid; place-items: center; min-width: 0; aspect-ratio: 1; }
.intersection::before, .intersection::after { content: ''; position: absolute; background: #79552db3; pointer-events: none; }
.intersection::before { height: 1px; left: 0; right: 0; top: calc(50% - .5px); }
.intersection::after { width: 1px; top: 0; bottom: 0; left: calc(50% - .5px); }
.first-column::before { left: 50%; }.last-column::before { right: 50%; }
.first-row::after { top: 50%; }.last-row::after { bottom: 50%; }
.intersection:focus-visible, .intersection.pad-cursor { outline: 2px solid #84601d; outline-offset: -1px; border-radius: 4px; z-index: 2; background: #fff3b850; }
.intersection.pad-cursor { outline-color: #fff4ad; box-shadow: inset 0 0 0 3px #84601d; }
.disc, .hover-stone { position: relative; z-index: 1; width: 84%; height: 84%; border-radius: 50%; }
.disc.black { background: radial-gradient(circle at 35% 25%, #55584c, #262f29 58%, #17231d); box-shadow: inset 0 1px 1px #ffffff28, 0 2px 2px #67462270; }
.disc.white { background: radial-gradient(circle at 35% 25%, #fffef5, #f3eddf 65%, #c8c5b4); box-shadow: inset 0 1px 1px #fff, 0 2px 2px #67462270; }
.disc.placed { animation: place .24s ease-out; }
.winning .disc { outline: 2px solid #e8ac3e; outline-offset: 1px; }
.last-dot { position: absolute; top: 42%; left: 42%; width: 16%; height: 16%; border-radius: 50%; background: #caa864; box-shadow: 0 0 0 1px #72521555; }
.hover-stone { opacity: 0; background: #263e35; pointer-events: none; }.turn-white .hover-stone { background: #fffdf1; }
.board-star { position: absolute; width: 16%; height: 16%; border-radius: 50%; background: #79552d; }
.suggestion-marker { display: grid; place-items: center; width: 92%; height: 92%; z-index: 1; border: 2px solid var(--hint-gold); border-radius: 50%; background: var(--hint-soft); color: var(--hint-ink); }
.suggestion-marker svg { width: 80%; height: 80%; }
.forbidden-marker { position: relative; width: 62%; height: 62%; z-index: 1; border-radius: 50%; background: var(--danger-soft); pointer-events: none; }
.forbidden-marker::before, .forbidden-marker::after { content: ''; position: absolute; top: calc(50% - 1px); left: 15%; width: 70%; height: 2px; border-radius: 1px; background: var(--danger); transform: rotate(45deg); }
.forbidden-marker::after { transform: rotate(-45deg); }
.victory-line { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
.victory-line polyline { fill: none; stroke: #e6ad43; stroke-width: .085; stroke-linecap: round; stroke-linejoin: round; }
.coordinates { position: absolute; display: grid; color: #634729; font-family: ui-monospace, monospace; font-size: var(--text-micro); text-align: center; }
.top { grid-template-columns: repeat(var(--board-size), minmax(0, 1fr)); top: 5px; left: 24px; right: 10px; }
.side { grid-template-rows: repeat(var(--board-size), minmax(0, 1fr)); left: 5px; width: 16px; top: 25px; bottom: 25px; align-items: center; }
.board-label { position: absolute; bottom: 5px; left: 0; width: 100%; text-align: center; color: #634729; font-family: ui-monospace, monospace; font-size: var(--text-micro); letter-spacing: .01em; }
@media (hover: hover) { .playable:hover .hover-stone { opacity: .3; } }
@keyframes place { from { opacity: .4; transform: translateY(-5px) scale(.8); } }
</style>
