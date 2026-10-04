import type { AiDifficulty, GameState } from './types.js';
import { chooseDifficultyMove as chooseReversiMove } from '../games/reversi/ai.js';
import { chooseDifficultyMove as chooseGomokuMove } from '../games/gomoku/ai.js';
import { chooseDifficultyMove as chooseChessMove } from '../games/chess/ai.js';
import { chooseDifficultyMove as chooseJanggiMove } from '../games/janggi/ai.js';

export function chooseDifficultyMove(state: GameState, difficulty: AiDifficulty): number | null {
  if (state.gameType === 'chess') return chooseChessMove(state, difficulty);
  if (state.gameType === 'janggi') return chooseJanggiMove(state, difficulty);
  return state.gameType === 'gomoku'
    ? chooseGomokuMove(state, difficulty)
    : chooseReversiMove(state, difficulty);
}
