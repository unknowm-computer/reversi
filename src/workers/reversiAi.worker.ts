import { chooseDifficultyMove } from '../../shared/game/ai';
import type { AiDifficulty, GameState } from '../../shared/game/types';
// Hints omit difficulty and keep using the strongest search.
self.onmessage = (event: MessageEvent<GameState & { difficulty?: AiDifficulty }>): void => {
  const state = event.data;
  self.postMessage({ gameId: state.gameId, revision: state.revision, index: chooseDifficultyMove(state, state.difficulty ?? 5) });
};
