import { onUnmounted, ref, watch, type Ref } from 'vue';
import { legalMoves } from '../../shared/game/rules';
import type { GameState } from '../../shared/game/types';

interface HintAnswer {
  gameId: string;
  revision: number;
  index: number | null;
}

interface GameHint {
  index: Ref<number | null>;
  busy: Ref<boolean>;
  error: Ref<string | null>;
  request: () => void;
}

const RETRY_MESSAGE = '힌트를 불러오지 못했어요. 다시 눌러 주세요.';

export function useGameHint(getState: () => GameState, canRequest: Readonly<Ref<boolean>>): GameHint {
  const index = ref<number | null>(null);
  const busy = ref(false);
  const error = ref<string | null>(null);
  let worker: Worker | null = null;

  function positionKey(): string {
    const state = getState();
    return JSON.stringify([state.gameId, state.revision, state.turn, state.board, state.result]);
  }

  function stop(): void {
    worker?.terminate();
    worker = null;
    busy.value = false;
  }

  function clear(): void {
    stop();
    index.value = null;
    error.value = null;
  }

  function request(): void {
    const state = getState();
    if (!canRequest.value || busy.value || state.result) return;
    const moves = legalMoves(state.board, state.turn);
    if (!moves.length || (index.value !== null && moves.includes(index.value))) return;

    const key = positionKey();
    error.value = null;
    busy.value = true;
    try {
      const task = new Worker(new URL('../workers/reversiAi.worker.ts', import.meta.url), { type: 'module' });
      worker = task;
      const isCurrent = (): boolean => worker === task && canRequest.value && key === positionKey();
      task.onmessage = (event: MessageEvent<HintAnswer>): void => {
        if (!isCurrent()) return;
        const answer = event.data;
        if (answer.gameId !== state.gameId || answer.revision !== state.revision) return;
        stop();
        if (answer.index !== null && moves.includes(answer.index)) index.value = answer.index;
        else error.value = RETRY_MESSAGE;
      };
      task.onerror = (): void => {
        if (!isCurrent()) return;
        stop();
        error.value = RETRY_MESSAGE;
      };
      // Plain copies can cross the worker boundary even when the store is reactive.
      task.postMessage({ ...state, board: [...state.board], flipped: [...state.flipped], result: null } satisfies GameState);
    } catch {
      stop();
      error.value = RETRY_MESSAGE;
    }
  }

  watch([canRequest, positionKey], clear, { flush: 'sync' });
  onUnmounted(clear);
  return { index, busy, error, request };
}
