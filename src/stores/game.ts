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
  const undoIndex = computed(() => {
    if (settings.value.mode === 'online' || (state.value.result && state.value.result.reason !== 'noLegalMoves')) return -1;
    if (settings.value.mode === 'ai') {
      for (let i = history.value.length - 1; i >= 0; i--) if (history.value[i].actor === 'black') return i;
      return -1;
    }
    const last = history.value.at(-1);
    if (!last || settings.value.undoLimit === 0 || (settings.value.undoLimit > 0 && undoUsed.value[last.actor] >= settings.value.undoLimit)) return -1;
    return history.value.length - 1;
  });
  const canUndo = computed(() => undoIndex.value >= 0);
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
  function undo(): { remaining: number; actor: Color } | null {
    if (undoIndex.value < 0) return null;
    const index = undoIndex.value, entry = history.value[index];
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
  return { settings, state, history, undoUsed, active, counts, canUndo, start, move, undo, finish, online };
});
