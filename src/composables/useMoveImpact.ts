import { computed, onUnmounted, ref, watch } from 'vue';
import { isPieceMove } from '../../shared/game/piece-events';
import { isPieceGame, type Color, type GameState } from '../../shared/game/types';

export const IMPACT_MS = 1400;
export const LARGE_CAPTURE = 5;
export type ImpactKind = 'capture' | 'check' | 'janggun';
export function impactKind(before: GameState, next: GameState): ImpactKind | null {
  if (isPieceGame(before.gameType)) {
    if (next.result || !isPieceMove(before, next)
      || next.check !== next.turn || before.check === next.check) return null;
    return next.gameType === 'chess' ? 'check' : 'janggun';
  }
  if (before.gameType !== 'reversi' || next.gameType !== 'reversi') return null;
  if (before.gameId !== next.gameId || next.revision !== before.revision + 1 || next.lastMove === null || before.board[next.lastMove] !== null || !next.flipped.length) return null;
  return next.flipped.length >= LARGE_CAPTURE ? 'capture' : null;
}
export function useMoveImpact(state: () => GameState, onStart?: () => void, shouldBlockCheck: () => boolean = () => true) {
  const scene = ref<{ actor: Color; kind: ImpactKind; count: number } | null>(null);
  const preview = ref<GameState | null>(null);
  const busy = ref(false);
  let revealTimer: number | undefined, endTimer: number | undefined;
  function cancel(): void {
    window.clearTimeout(revealTimer); window.clearTimeout(endTimer);
    scene.value = null; preview.value = null; busy.value = false;
  }
  watch(state, (next, before) => {
    if (before.gameType === next.gameType && before.gameId === next.gameId && before.revision === next.revision) return;
    cancel();
    const kind = impactKind(before, next);
    if (!kind || document.hidden) return;
    if (kind === 'capture') {
      const board = [...before.board]; board[next.lastMove!] = before.turn;
      preview.value = { ...next, board, flipped: [] };
    }
    scene.value = { actor: before.turn, kind, count: next.flipped.length };
    busy.value = kind === 'capture' || shouldBlockCheck();
    onStart?.();
    revealTimer = window.setTimeout(() => { scene.value = null; preview.value = null; }, IMPACT_MS);
    const duration = kind === 'capture' ? IMPACT_MS + 460 + next.flipped.length * 14 : IMPACT_MS;
    endTimer = window.setTimeout(() => { busy.value = false; }, duration);
  }, { flush: 'sync' });
  onUnmounted(cancel);
  return { scene, busy, displayed: computed(() => preview.value ?? state()), cancel };
}
