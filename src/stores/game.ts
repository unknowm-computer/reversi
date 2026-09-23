import { createId } from '../utils/id';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { applyMove, endGame, initialState, score } from '../../shared/game/rules';
import { DEFAULT_SETTINGS, type Color, type GameSettings, type GameState, type HistoryEntry } from '../../shared/game/types';
export const useGameStore = defineStore('game', () => {
  const settings = ref<GameSettings>({ ...DEFAULT_SETTINGS });
  const state = ref<GameState>(initialState(createId()));
  const history = ref<HistoryEntry[]>([]);
  const undoUsed = ref<Record<Color, number>>({ black: 0, white: 0 });
  const active = ref(false);
  const counts = computed(() => score(state.value.board));
  function findUndoIndex(color?: Color): number {
    if (settings.value.mode === 'online' || (state.value.result && state.value.result.reason !== 'noLegalMoves')) return -1;
    if (settings.value.mode === 'ai' && color === 'white') return -1;
    const actor = settings.value.mode === 'ai' ? 'black' : color ?? history.value.at(-1)?.actor;
    if (!actor) return -1;
    if (settings.value.mode === 'local' && (settings.value.undoLimit === 0 || (settings.value.undoLimit > 0 && undoUsed.value[actor] >= settings.value.undoLimit))) return -1;
    for (let i = history.value.length - 1; i >= 0; i--) if (history.value[i].actor === actor) return i;
    return -1;
  }
  const undoIndex = computed<number>(() => findUndoIndex());
  const canUndo = computed(() => undoIndex.value >= 0);
  function canUndoFor(color: Color): boolean { return findUndoIndex(color) >= 0; }
  function start(next: GameSettings): void {
    settings.value = { ...next }; state.value = initialState(createId());
    history.value = []; undoUsed.value = { black: 0, white: 0 }; active.value = true;
  }
  function move(index: number, remaining: number): boolean {
    const next = applyMove(state.value, index);
    if (!next) return false;
    history.value.push({ state: { ...state.value, board: [...state.value.board], flipped: [...state.value.flipped] }, remaining, actor: state.value.turn });
    state.value = next; return true;
  }
  function undo(color?: Color): { remaining: number; actor: Color } | null {
    const index = findUndoIndex(color);
    if (index < 0) return null;
    const entry = history.value[index];
    const revision = state.value.revision + 1;
    state.value = { ...entry.state, board: [...entry.state.board], revision, flipped: [] };
    history.value.splice(index);
    undoUsed.value[entry.actor]++;
    return { remaining: entry.remaining, actor: entry.actor };
  }
  function finish(loser: Color, reason: 'resign' | 'timeout'): void { state.value = endGame(state.value, loser, reason); }
  function online(next: GameState, config: GameSettings): void {
    settings.value = { ...config }; state.value = next; active.value = true; history.value = [];
  }
  return { settings, state, history, undoUsed, active, counts, canUndo, canUndoFor, start, move, undo, finish, online };
});
