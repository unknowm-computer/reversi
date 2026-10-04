import { onUnmounted, ref, watch, type Ref } from 'vue';
import { legalMoves } from '../../shared/game/engine';
import type { GameState } from '../../shared/game/types';
import { useGameAiWorker } from './useGameAiWorker';

interface GameHint {
  index: Ref<number | null>;
  busy: Readonly<Ref<boolean>>;
  error: Ref<string | null>;
  request: () => void;
}

const RETRY_MESSAGE = '힌트를 불러오지 못했어요. 다시 눌러 주세요.';

export function useGameHint(getState: () => GameState, canRequest: Readonly<Ref<boolean>>): GameHint {
  const index = ref<number | null>(null);
  const error = ref<string | null>(null);
  let requestedPosition: string | null = null;
  const worker = useGameAiWorker(getState, answer => {
    if (!canRequest.value || requestedPosition !== positionKey()) return;
    const state = getState();
    if (answer !== null && legalMoves(state).includes(answer)) index.value = answer;
    else error.value = RETRY_MESSAGE;
  }, () => {
    if (canRequest.value && requestedPosition === positionKey()) error.value = RETRY_MESSAGE;
  });

  function positionKey(): string {
    const state = getState();
    return JSON.stringify([state.gameType, state.gameId, state.revision, state.turn, state.board, state.pieces, state.chess, state.janggi, state.result]);
  }

  function clear(): void {
    worker.cancel();
    requestedPosition = null;
    index.value = null;
    error.value = null;
  }

  function request(): void {
    const state = getState();
    if (!canRequest.value || worker.busy.value || state.result) return;
    const moves = legalMoves(state);
    if (!moves.length || (index.value !== null && moves.includes(index.value))) return;

    requestedPosition = positionKey();
    error.value = null;
    worker.request();
  }

  watch([canRequest, positionKey], clear, { flush: 'sync' });
  onUnmounted(clear);
  return { index, busy: worker.busy, error, request };
}
