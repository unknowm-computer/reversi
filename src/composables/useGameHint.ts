import { onUnmounted, ref, watch, type Ref } from 'vue';
import { legalMoves } from '../../shared/game/engine';
import type { GameState } from '../../shared/game/types';
import { useGameAiWorker } from './useGameAiWorker';

interface GameHint {
  index: Ref<number | null>;
  busy: Readonly<Ref<boolean>>;
  error: Ref<string | null>;
  request: () => void;
  toggle: () => void;
}

const RETRY_MESSAGE = '힌트를 불러오지 못했어요. 다시 눌러 주세요.';

export function useGameHint(getState: () => GameState, canRequest: Readonly<Ref<boolean>>): GameHint {
  const index = ref<number | null>(null);
  const error = ref<string | null>(null);
  let requestedPosition: string | null = null;
  let cachedHint: { position: string; index: number } | null = null;
  const worker = useGameAiWorker(getState, answer => {
    const position = requestedPosition;
    requestedPosition = null;
    if (!canRequest.value || position === null || position !== positionKey()) return;
    const state = getState();
    if (answer !== null && legalMoves(state).includes(answer)) {
      cachedHint = { position, index: answer };
      index.value = answer;
    }
    else error.value = RETRY_MESSAGE;
  }, () => {
    const position = requestedPosition;
    requestedPosition = null;
    if (canRequest.value && position === positionKey()) error.value = RETRY_MESSAGE;
  });

  function positionKey(): string {
    const state = getState();
    return JSON.stringify([state.gameType, state.gameId, state.revision, state.turn, state.board, state.pieces, state.chess, state.janggi, state.result]);
  }

  function clear(): void {
    worker.cancel();
    requestedPosition = null;
    cachedHint = null;
    index.value = null;
    error.value = null;
  }

  function request(): void {
    const state = getState();
    if (!canRequest.value || worker.busy.value || state.result) return;
    const moves = legalMoves(state);
    if (!moves.length || (index.value !== null && moves.includes(index.value))) return;

    const position = positionKey();
    error.value = null;
    if (cachedHint?.position === position && moves.includes(cachedHint.index)) {
      index.value = cachedHint.index;
      return;
    }

    requestedPosition = position;
    worker.request();
  }

  function toggle(): void {
    if (!canRequest.value || getState().result) return;
    if (worker.busy.value) {
      worker.cancel();
      requestedPosition = null;
      error.value = null;
      return;
    }
    if (index.value !== null) {
      index.value = null;
      return;
    }
    request();
  }

  watch([canRequest, positionKey], clear, { flush: 'sync' });
  onUnmounted(clear);
  return { index, busy: worker.busy, error, request, toggle };
}
