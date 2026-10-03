import type { AiDifficulty, GameState, GameType } from '../../shared/game/types';

export type GameAiRequest = GameState & { difficulty?: AiDifficulty };

export interface GameAiAnswer {
  gameType: GameType;
  gameId: string;
  revision: number;
  index: number | null;
}
