import { chooseDifficultyMove } from '../../shared/game/ai';
import type { GameAiAnswer, GameAiRequest } from './gameAi.types';
// Hints omit difficulty and keep using the strongest search.
self.onmessage = (event: MessageEvent<GameAiRequest>): void => {
  const state = event.data;
  self.postMessage({ gameType: state.gameType, gameId: state.gameId, revision: state.revision, index: chooseDifficultyMove(state, state.difficulty ?? 5) } satisfies GameAiAnswer);
};
