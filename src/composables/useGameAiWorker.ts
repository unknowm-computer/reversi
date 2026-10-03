import { onUnmounted, ref, type Ref } from 'vue';
import { snapshotGameState } from '../../shared/game/state';
import type { AiDifficulty, GameState } from '../../shared/game/types';
import type { GameAiAnswer, GameAiRequest } from '../workers/gameAi.types';

interface GameAiWorker {
  busy: Readonly<Ref<boolean>>;
  request: (difficulty?: AiDifficulty) => void;
  cancel: () => void;
}

export function useGameAiWorker(
  getState: () => GameState,
  onAnswer: (index: number | null) => void,
  onError: () => void,
): GameAiWorker {
  const busy = ref(false);
  let worker: Worker | null = null;

  function cancel(): void {
    worker?.terminate();
    worker = null;
    busy.value = false;
  }

  function request(difficulty?: AiDifficulty): void {
    cancel();
    const state = snapshotGameState(getState());
    busy.value = true;
    try {
      const task = new Worker(new URL('../workers/gameAi.worker.ts', import.meta.url), { type: 'module' });
      worker = task;
      const isCurrent = (): boolean => {
        const current = getState();
        return worker === task && current.gameType === state.gameType && current.gameId === state.gameId && current.revision === state.revision;
      };
      task.onmessage = (event: MessageEvent<GameAiAnswer>): void => {
        const answer = event.data;
        if (!isCurrent() || answer.gameType !== state.gameType || answer.gameId !== state.gameId || answer.revision !== state.revision) return;
        cancel();
        onAnswer(answer.index);
      };
      task.onerror = (): void => {
        if (!isCurrent()) return;
        cancel();
        onError();
      };
      // Omitted difficulty keeps hints on the strongest search.
      const message: GameAiRequest = difficulty === undefined ? state : { ...state, difficulty };
      task.postMessage(message);
    } catch {
      cancel();
      onError();
    }
  }

  onUnmounted(cancel);
  return { busy, request, cancel };
}
