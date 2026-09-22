import { chooseMove } from '../../shared/game/ai';
import type { GameState } from '../../shared/game/types';
self.onmessage = (event: MessageEvent<GameState>): void => {
  const state = event.data;
  self.postMessage({ gameId: state.gameId, revision: state.revision, index: chooseMove(state) });
};
