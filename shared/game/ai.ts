import type { AiDifficulty, GameState } from './types.js';
import { chooseDifficultyMove as chooseReversiMove } from '../games/reversi/ai.js';
import { chooseDifficultyMove as chooseGomokuMove } from '../games/gomoku/ai.js';

export function chooseDifficultyMove(state: GameState, difficulty: AiDifficulty): number | null {
  return state.gameType === 'gomoku'
    ? chooseGomokuMove(state, difficulty)
    : chooseReversiMove(state, difficulty);
}
