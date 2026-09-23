import { computed, onUnmounted, ref, watch } from 'vue';
import type { Color, GameState } from '../../shared/game/types';

export const IMPACT_MS = 1400;
export const LARGE_CAPTURE = 5;
export function impactKind(before: GameState, next: GameState): 'capture' | null {
  if (before.gameId !== next.gameId || next.revision !== before.revision + 1 || next.lastMove === null || before.board[next.lastMove] !== null || !next.flipped.length) return null;
  return next.flipped.length >= LARGE_CAPTURE ? 'capture' : null;
}
export function useMoveImpact(state: () => GameState, onStart?: () => void) {
  const scene = ref<{ actor: Color; kind: 'capture'; count: number } | null>(null);
  const preview = ref<GameState | null>(null);
  const busy = ref(false);
  let revealTimer: number | undefined, endTimer: number | undefined;
  function cancel(): void {
    window.clearTimeout(revealTimer); window.clearTimeout(endTimer);
    scene.value = null; preview.value = null; busy.value = false;
  }
  watch(state, (next, before) => {
    if (before.gameId === next.gameId && before.revision === next.revision) return;
    cancel();
    const kind = impactKind(before, next);
    if (!kind || document.hidden) return;
    const board = [...before.board]; board[next.lastMove!] = before.turn;
    preview.value = { ...next, board, flipped: [] };
    scene.value = { actor: before.turn, kind, count: next.flipped.length }; busy.value = true;
    onStart?.();
    revealTimer = window.setTimeout(() => { scene.value = null; preview.value = null; }, IMPACT_MS);
    endTimer = window.setTimeout(() => { busy.value = false; }, IMPACT_MS + 460 + next.flipped.length * 14);
  }, { flush: 'sync' });
  onUnmounted(cancel);
  return { scene, busy, displayed: computed(() => preview.value ?? state()), cancel };
}
