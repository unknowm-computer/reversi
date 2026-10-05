<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { Color, GameState, Piece } from '../../../shared/game/types';
import { gameName, sideName } from '../../../shared/game/types';
import { decodePieceMove, JANGGI_PASS, pieceName, type PieceMove } from '../../../shared/game/pieces';
import { useGamepad } from '../../composables/useGamepad';
import { usePieceBoardFeedback } from '../../composables/usePieceBoardFeedback';
import AppIcon from '../common/AppIcon.vue';
import PieceArt from './PieceArt.vue';
import PieceHintArrow from './PieceHintArrow.vue';

interface Props { state: GameState; legal: number[]; interactive: boolean; hintIndex: number | null; perspective?: Color }
interface BoardMove extends PieceMove { code: number }
const props = withDefaults(defineProps<Props>(), { perspective: 'black' });
const emit = defineEmits<{ (event: 'move', index: number): void }>();
const grid = ref<HTMLElement | null>(null);
const promotionPanel = ref<HTMLElement | null>(null);
const selected = ref<number | null>(null);
const promotionOptions = ref<BoardMove[]>([]);
const promotionIndex = ref<number>(0);
const columns = computed<number>(() => props.state.gameType === 'janggi' ? 9 : 8);
const rows = computed<number>(() => props.state.gameType === 'janggi' ? 10 : 8);
const total = computed<number>(() => columns.value * rows.value);
const reversed = computed<boolean>(() => props.perspective === 'white');
const focusIndex = ref<number>(props.perspective === 'white' ? 0 : (props.state.gameType === 'janggi' ? 85 : 60));
const enabled = computed<boolean>(() => props.interactive && !props.state.result);
const { captureCell, checkCell } = usePieceBoardFeedback(() => props.state);
const cells = computed<number[]>(() => Array.from({ length: total.value }, (_, index) => reversed.value ? total.value - 1 - index : index));
const fileLabels = computed<string[]>(() => Array.from({ length: columns.value }, (_, index) => String.fromCharCode(65 + (reversed.value ? columns.value - 1 - index : index))));
const rankLabels = computed<number[]>(() => Array.from({ length: rows.value }, (_, index) => reversed.value ? index + 1 : rows.value - index));
const moves = computed<BoardMove[]>(() => props.legal.flatMap(code => {
  const move = decodePieceMove(code);
  return move && move.from < total.value && move.to < total.value ? [{ ...move, code }] : [];
}));
const sources = computed<Set<number>>(() => new Set(moves.value.map(move => move.from)));
const destinations = computed<Set<number>>(() => new Set(moves.value.filter(move => move.from === selected.value).map(move => move.to)));
const suggestion = computed<BoardMove | null>(() => moves.value.find(move => move.code === props.hintIndex) ?? null);
const suggestedPiece = computed<Piece | null>(() => suggestion.value ? pieceAt(suggestion.value.from) : null);
const suggestedPromotion = computed<string>(() => suggestion.value && suggestedPiece.value?.kind === 'pawn'
  && [0, rows.value - 1].includes(Math.floor(suggestion.value.to / columns.value)) ? pieceName(suggestion.value.promotion) : '');
const hintMessage = computed<string>(() => suggestion.value && suggestedPiece.value
  ? `힌트: 1번 ${coordinate(suggestion.value.from)}의 말(${displayedPieceName(suggestedPiece.value)})을 선택한 뒤, 2번 ${coordinate(suggestion.value.to)}로 이동해 보세요.${suggestedPromotion.value ? ` ${suggestedPromotion.value} 승격을 선택하세요.` : ''}`
  : props.hintIndex === JANGGI_PASS && props.legal.includes(JANGGI_PASS) ? '힌트: 이번 수는 쉬어 보세요.' : '');

function pieceAt(index: number): Piece | null { return props.state.pieces?.[index] ?? null; }
function coordinate(index: number): string { return `${String.fromCharCode(65 + index % columns.value)}${rows.value - Math.floor(index / columns.value)}`; }
function checked(index: number): boolean {
  const piece = pieceAt(index);
  return Boolean(piece && props.state.check === piece.color && (piece.kind === 'king' || piece.kind === 'general'));
}
function subdued(index: number): boolean {
  const piece = pieceAt(index);
  return Boolean(enabled.value && piece && !canSelect(index));
}
function canSelect(index: number): boolean { return enabled.value && pieceAt(index)?.color === props.state.turn && sources.value.has(index); }
function canActivate(index: number): boolean { return enabled.value && !promotionOptions.value.length && (canSelect(index) || destinations.value.has(index)); }
function displayedPieceName(piece: Piece): string {
  if (props.state.gameType === 'janggi') {
    if (piece.kind === 'rook') return '차';
    if (piece.kind === 'soldier') return piece.color === 'black' ? '졸' : '병';
  }
  return pieceName(piece.kind);
}
function label(index: number): string {
  const piece = pieceAt(index);
  const content = piece ? `${sideName(props.state.gameType, piece.color)} ${displayedPieceName(piece)}` : '빈칸';
  return `${coordinate(index)}, ${content}${selected.value === index ? ', 선택됨' : canSelect(index) ? ', 선택 가능' : ''}${enabled.value && destinations.value.has(index) ? ', 이동 가능' : ''}${checked(index) ? props.state.gameType === 'janggi' ? ', 장군' : ', 체크' : ''}${props.state.lastFrom === index ? ', 마지막 이동 출발' : ''}${props.state.lastMove === index ? ', 마지막 이동 도착' : ''}${suggestion.value?.from === index ? ', 힌트 출발' : suggestion.value?.to === index ? ', 힌트 도착' : ''}`;
}
function clearSelection(): void { selected.value = null; promotionOptions.value = []; promotionIndex.value = 0; }
function send(move: BoardMove): void {
  if (enabled.value && props.legal.includes(move.code)) {
    const restoreFocus = promotionOptions.value.length > 0;
    focusIndex.value = move.to;
    emit('move', move.code);
    clearSelection();
    if (restoreFocus) void nextTick(() => focusCell());
  }
}
function choose(index: number): void {
  if (!enabled.value || promotionOptions.value.length) return;
  if (selected.value === index) { clearSelection(); return; }
  if (canSelect(index)) { selected.value = index; return; }
  const options = moves.value.filter(move => move.from === selected.value && move.to === index);
  if (options.length === 1) send(options[0]);
  else if (options.length > 1) {
    promotionOptions.value = options;
    promotionIndex.value = 0;
    void nextTick(() => focusPromotion());
  } else clearSelection();
}
function focusCell(): void { grid.value?.querySelector<HTMLButtonElement>(`[data-cell="${focusIndex.value}"]`)?.focus({ preventScroll: true }); }
function focusPromotion(): void { promotionPanel.value?.querySelectorAll<HTMLButtonElement>('[data-promotion]')[promotionIndex.value]?.focus({ preventScroll: true }); }
function cancelPromotion(): void { promotionOptions.value = []; focusCell(); }
function navigatePromotion(key: string): boolean {
  const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : key === 'ArrowRight' || key === 'ArrowDown' ? 1 : 0;
  if (!direction) return false;
  promotionIndex.value = (promotionIndex.value + direction + promotionOptions.value.length) % promotionOptions.value.length;
  focusPromotion();
  return true;
}
function moveFocus(key: string, index: number): boolean {
  if (promotionOptions.value.length) return navigatePromotion(key);
  const displayIndex = reversed.value ? total.value - 1 - index : index;
  const row = Math.floor(displayIndex / columns.value), col = displayIndex % columns.value;
  const targets: Record<string, number> = {
    ArrowLeft: row * columns.value + (col + columns.value - 1) % columns.value,
    ArrowRight: row * columns.value + (col + 1) % columns.value,
    ArrowUp: ((row + rows.value - 1) % rows.value) * columns.value + col,
    ArrowDown: ((row + 1) % rows.value) * columns.value + col,
    Home: row * columns.value,
    End: row * columns.value + columns.value - 1,
  };
  const target = targets[key];
  if (target === undefined) return false;
  focusIndex.value = reversed.value ? total.value - 1 - target : target;
  focusCell();
  return true;
}
function navigate(event: KeyboardEvent, index: number): void {
  if (event.key === 'Escape') { clearSelection(); event.preventDefault(); }
  else if (moveFocus(event.key, index)) event.preventDefault();
}
function promotionKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelPromotion(); }
  else if (navigatePromotion(event.key)) event.preventDefault();
}
watch(() => [props.state.gameId, props.state.gameType, props.state.revision, props.state.turn, props.perspective, props.hintIndex, enabled.value], () => {
  clearSelection();
  if (focusIndex.value >= total.value) focusIndex.value = total.value - 1;
}, { flush: 'sync' });
const pad = useGamepad(enabled, {
  direction: direction => { moveFocus(direction, focusIndex.value); },
  confirm: () => {
    if (promotionOptions.value.length) { send(promotionOptions.value[promotionIndex.value]); return; }
    focusCell(); choose(focusIndex.value);
  },
});
</script>

<template>
  <div class="piece-board-input" :class="state.gameType" :style="{ '--board-columns': columns, '--board-rows': rows }">
    <div class="piece-board-frame">
      <div class="coordinates top" aria-hidden="true"><span v-for="file in fileLabels" :key="file">{{ file }}</span></div>
      <div class="coordinates side" aria-hidden="true"><span v-for="rank in rankLabels" :key="rank">{{ rank }}</span></div>
      <div ref="grid" class="piece-board" role="group" :aria-label="`${gameName(state.gameType)} 보드. 기물을 선택한 다음 이동할 곳을 선택하세요. 방향키로 이동하고 Enter 또는 Space로 선택하세요.`">
        <svg v-if="state.gameType === 'janggi'" class="palaces" viewBox="0 0 9 10" aria-hidden="true"><path d="m3.5 .5 2 2m0-2-2 2m0 5 2 2m0-2-2 2" /></svg>
        <button v-for="(index, displayIndex) in cells" :key="index" type="button" class="piece-cell"
          :class="{
            dark: (Math.floor(index / columns) + index % columns) % 2 === 1,
            'first-column': displayIndex % columns === 0, 'last-column': displayIndex % columns === columns - 1,
            'first-row': displayIndex < columns, 'last-row': displayIndex >= total - columns,
            selected: selected === index, playable: canSelect(index), destination: enabled && destinations.has(index),
            'last-from': state.lastFrom === index, 'last-to': state.lastMove === index,
            'hint-from': suggestion?.from === index, 'hint-to': suggestion?.to === index,
            checked: checked(index), 'check-arrival': checkCell === index,
            'capture-arrival': captureCell === index, 'pad-cursor': pad.active.value && enabled && focusIndex === index,
          }"
          :data-cell="index" :aria-label="label(index)" :aria-pressed="selected === index" :aria-disabled="!canActivate(index)"
          :tabindex="focusIndex === index ? 0 : -1" @focus="focusIndex = index" @keydown="navigate($event, index)" @click="choose(index)">
          <span v-if="pieceAt(index)" class="piece-holder" :class="{ general: pieceAt(index)?.kind === 'general', subdued: subdued(index) }"><PieceArt :piece="pieceAt(index)!" :game-type="state.gameType" /></span>
          <span v-if="enabled && destinations.has(index)" class="destination-marker" :class="{ capture: pieceAt(index) }" aria-hidden="true" />
          <template v-if="suggestion?.from === index || suggestion?.to === index">
            <span class="hint-outline" aria-hidden="true" />
            <span class="hint-marker" :class="suggestion?.from === index ? 'source' : 'target'" aria-hidden="true">{{ suggestion?.from === index ? '1' : '2' }}</span>
          </template>
          <span v-if="captureCell === index" class="capture-burst" aria-hidden="true"><i /><i /><i /></span>
          <span v-if="checked(index)" class="check-badge" aria-hidden="true">{{ state.gameType === 'janggi' ? '장군' : '체크' }}</span>
        </button>
        <PieceHintArrow v-if="suggestion" :from="suggestion.from" :to="suggestion.to" :columns="columns" :rows="rows" :reversed="reversed" />
      </div>
      <div v-if="promotionOptions.length" ref="promotionPanel" class="promotion-panel" role="group" aria-label="승격 기물 선택" @keydown="promotionKey">
        <div class="promotion-heading"><strong>어떤 기물로 바꿀까요?</strong><button type="button" aria-label="승격 선택 취소" @click="cancelPromotion"><AppIcon name="close" /></button></div>
        <div class="promotion-choices"><button v-for="(option, index) in promotionOptions" :key="option.code" type="button" :data-promotion="option.promotion" :aria-label="`${pieceName(option.promotion)}으로 승격`" @focus="promotionIndex = index" @click="send(option)"><PieceArt :piece="{ color: state.turn, kind: option.promotion }" game-type="chess" /><span>{{ pieceName(option.promotion) }}</span></button></div>
      </div>
      <div v-if="suggestion && suggestedPiece" class="board-label hint-guide" aria-hidden="true">
        <AppIcon name="hint" />
        <span class="hint-step source">1</span><strong>{{ displayedPieceName(suggestedPiece) }} {{ coordinate(suggestion.from) }}</strong>
        <AppIcon name="arrow" />
        <span class="hint-step target">2</span><strong>{{ coordinate(suggestion.to) }}{{ suggestedPromotion ? ` · ${suggestedPromotion} 승격` : '' }}</strong>
      </div>
      <div v-else class="board-label" aria-hidden="true">JANNABI & GRASSHOPPER · {{ state.gameType === 'janggi' ? 'JANGGI' : 'CHESS' }} CLUB</div>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ hintMessage }}</p>
    <p class="sr-only" role="status">{{ selected === null ? '' : `${coordinate(selected)} 선택됨. 이동할 곳을 선택하세요.` }}</p>
  </div>
</template>

<style scoped lang="scss">
.piece-board-input { min-width: 0; }
.piece-board-frame { position: relative; padding: 25px 13px 25px 25px; border: 1px solid #214237; border-radius: 15px; background: #315548; box-shadow: 0 5px 0 #213e32, 0 14px 26px #243e3217; }
.piece-board { position: relative; display: grid; grid-template-columns: repeat(var(--board-columns), minmax(0, 1fr)); aspect-ratio: var(--board-columns) / var(--board-rows); border: 1px solid #233f34; }
.piece-cell { position: relative; min-width: 0; min-height: 0; display: grid; place-items: center; aspect-ratio: 1; background: #eee9ce; isolation: isolate; }
.chess .piece-cell.dark { background: #709078; }
.piece-holder { position: relative; width: 85%; height: 85%; z-index: 1; transition: transform .16s ease, opacity .18s ease, filter .18s ease; }
.piece-holder.subdued { opacity: .6; filter: grayscale(1); }
.piece-cell.selected .piece-holder { transform: translateY(-5%); }
.piece-cell::after { content: ''; position: absolute; inset: 0; pointer-events: none; }
.piece-cell.last-from::after, .piece-cell.last-to::after { background: #efca6455; }
.piece-cell.hint-from::after, .piece-cell.hint-to::after { background: color-mix(in srgb, var(--hint-gold) 45%, transparent); }
.piece-cell.selected::after { background: #efcd665c; box-shadow: inset 0 0 0 3px #c6a245; }
.piece-cell.checked::after { background: #c34e4580; box-shadow: inset 0 0 0 3px var(--danger); }
.piece-cell.check-arrival::after { animation: check-arrival .72s ease-out; }
.check-badge { position: absolute; right: 1%; bottom: 0; z-index: 3; padding: 1px 4px; border: 1px solid #fff1d3; border-radius: 5px; background: #a4352a; color: #fffaf0; font-size: clamp(8px, 1.3vw, 11px); font-weight: 700; line-height: 1.4; pointer-events: none; }
.capture-burst { position: absolute; inset: 3%; z-index: 3; border: 2px solid #ffda73; border-radius: 50%; box-shadow: 0 0 10px #fff0b3cc; animation: capture-ring .72s ease-out both; pointer-events: none; }
.capture-burst i { position: absolute; width: 17%; height: 17%; background: #ffdf78; clip-path: polygon(50% 0, 62% 37%, 100% 50%, 62% 63%, 50% 100%, 38% 63%, 0 50%, 38% 37%); }
.capture-burst i:nth-child(1) { top: -11%; left: 9%; }.capture-burst i:nth-child(2) { top: 9%; right: -11%; }.capture-burst i:nth-child(3) { bottom: -8%; right: 15%; }
.piece-cell.capture-arrival .piece-holder { animation: capture-hop .42s ease-out; }
.piece-cell:focus-visible, .piece-cell.pad-cursor { outline: 3px solid #f2c86b; outline-offset: -3px; z-index: 2; }
.destination-marker { position: absolute; width: 23%; height: 23%; border-radius: 50%; background: #244f4280; z-index: 2; pointer-events: none; }
.destination-marker.capture { width: 91%; height: 91%; background: transparent; border: 3px solid #2858489c; }
.hint-outline { position: absolute; inset: 3%; border: 3px solid var(--hint-ink); border-radius: 10%; box-shadow: inset 0 0 0 2px var(--hint-soft), 0 0 0 1px var(--hint-soft); z-index: 2; pointer-events: none; }
.hint-to .hint-outline { border-style: dashed; }
.hint-marker, .hint-step { display: grid; place-items: center; border: 2px solid var(--hint-soft); border-radius: 50%; background: var(--hint-ink); color: var(--hint-soft); font-weight: 800; line-height: 1; }
.hint-marker { position: absolute; left: 2%; top: 2%; width: 30%; height: 30%; min-width: 16px; min-height: 16px; font-size: clamp(11px, 1.5vw, 17px); z-index: 3; pointer-events: none; box-shadow: 0 1px 3px #35250755; }
.hint-marker.target, .hint-step.target { background: var(--hint-soft); color: var(--hint-ink); border-color: var(--hint-ink); }
.coordinates { position: absolute; display: grid; color: var(--board-text); font-family: ui-monospace, monospace; font-size: var(--text-micro); text-align: center; }
.coordinates.top { grid-template-columns: repeat(var(--board-columns), minmax(0, 1fr)); left: 25px; right: 13px; top: 5px; }
.coordinates.side { grid-template-rows: repeat(var(--board-rows), minmax(0, 1fr)); top: 25px; bottom: 25px; left: 3px; width: 19px; align-items: center; }
.board-label { position: absolute; bottom: 5px; left: 0; width: 100%; text-align: center; color: var(--board-text); font-family: ui-monospace, monospace; font-size: var(--text-micro); }
.board-label.hint-guide { bottom: 3px; display: flex; align-items: center; justify-content: center; gap: var(--space-1); color: var(--hint-soft); font-family: inherit; font-size: var(--text-caption); white-space: nowrap; }
.hint-guide svg { width: 15px; height: 15px; flex-shrink: 0; }
.hint-step { width: 17px; height: 17px; font-size: 11px; flex-shrink: 0; }
.janggi .board-label.hint-guide { color: var(--hint-ink); }
.janggi .piece-board-frame { border-color: #a17d4c; background: #d6ae72; box-shadow: 0 5px 0 #a97c46, 0 14px 26px #63472917; }
.janggi .piece-board { border: 0; background: repeating-linear-gradient(3deg, transparent 0 9px, #af7e3910 10px, transparent 11px 24px), #e9c88f; border-radius: 5px; }
.janggi .piece-cell { background: transparent; }
.janggi .piece-cell::before { position: absolute; content: ''; inset: 0; background: linear-gradient(#79552daa, #79552daa) center / 100% 1px no-repeat, linear-gradient(#79552daa, #79552daa) center / 1px 100% no-repeat; pointer-events: none; }
.janggi .first-column::before { left: 50%; background-position: left center; }.janggi .last-column::before { right: 50%; background-position: right center; }
.janggi .first-row::before { top: 50%; background-position: center top; }.janggi .last-row::before { bottom: 50%; background-position: center bottom; }
.janggi .first-row.first-column::before { background-position: left top; }.janggi .first-row.last-column::before { background-position: right top; }
.janggi .last-row.first-column::before { background-position: left bottom; }.janggi .last-row.last-column::before { background-position: right bottom; }
.janggi .piece-holder { width: 86%; height: 86%; }.janggi .piece-holder.general { width: 98%; height: 98%; }
.janggi .coordinates, .janggi .board-label { color: #634729; }
.palaces { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }.palaces path { stroke: #79552daa; stroke-width: .025; fill: none; }
.janggi .piece-cell::after { border-radius: 12%; }.janggi .piece-cell.checked::after { background: #c34e4540; }
.promotion-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92%, 360px); padding: var(--space-3); border: 1px solid var(--line); border-radius: 14px; background: var(--card); box-shadow: 0 10px 40px #193e3260; z-index: 3; }
.promotion-heading { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); font-size: var(--text-small); }
.promotion-heading button { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 6px; }
.promotion-choices { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-1); }
.promotion-choices button { display: grid; place-items: center; padding: var(--space-1); border: 1px solid var(--line); border-radius: 8px; background: var(--paper); font-size: var(--text-caption); }
.promotion-choices .piece-art { width: 100%; max-width: 62px; aspect-ratio: 1; }
@media (hover: hover) { .piece-cell.playable:hover .piece-holder { transform: translateY(-5%); }.promotion-choices button:hover { background: var(--lime); } }
@keyframes capture-ring { 0% { opacity: 0; transform: scale(.7); } 18% { opacity: 1; } 100% { opacity: 0; transform: scale(1.25); } }
@keyframes capture-hop { 0%, 100% { transform: translateY(0); } 45% { transform: translateY(-9%); } }
@keyframes check-arrival { 0%, 100% { opacity: 1; } 40% { opacity: .3; } }
@media (prefers-reduced-motion: reduce) {
  .piece-holder { transition: none; }
  .piece-cell.capture-arrival .piece-holder, .piece-cell.check-arrival::after { animation: none; }
  .capture-burst { animation: none; box-shadow: none; }
}
</style>
