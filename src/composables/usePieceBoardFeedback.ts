import { onUnmounted, ref, watch } from 'vue';
import { capturedPieceCount, isPieceMove } from '../../shared/game/piece-events';
import type { GameState } from '../../shared/game/types';

export function usePieceBoardFeedback(state: () => GameState) {
  const captureCell = ref<number | null>(null);
  const checkCell = ref<number | null>(null);
  let effectTimer: number | undefined;
  function clear(): void {
    window.clearTimeout(effectTimer);
    captureCell.value = null;
    checkCell.value = null;
  }
  watch(state, (next, before) => {
    if (next.gameId === before.gameId && next.gameType === before.gameType && next.revision === before.revision) return;
    clear();
    if (document.hidden || !isPieceMove(before, next)) return;
    if (capturedPieceCount(before, next)) captureCell.value = next.lastMove;
    if (next.check && next.check !== before.check) {
      const king = next.pieces?.findIndex(piece => piece && piece.color === next.check && (piece.kind === 'king' || piece.kind === 'general')) ?? -1;
      if (king >= 0) checkCell.value = king;
    }
    if (captureCell.value !== null || checkCell.value !== null) effectTimer = window.setTimeout(clear, 720);
  }, { flush: 'sync' });
  onUnmounted(clear);
  return { captureCell, checkCell };
}
