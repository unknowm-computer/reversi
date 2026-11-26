import type { AiDifficulty, Color, GameState, Piece } from '../../game/types.js';
import { opposite } from '../../game/state.js';
import { turns } from './rules.js';

function evaluate(board: (Piece | null)[], color: Color): number {
  return board.reduce((sum, piece, square) => {
    if (!piece) return sum;
    const row = Math.floor(square / 8);
    const value = piece.kind === 'king' ? 175 : 100 + 4 * (piece.color === 'black' ? 7 - row : row);
    return sum + (piece.color === color ? value : -value);
  }, 0);
}

export function chooseMove(state: GameState, difficulty: AiDifficulty): number | null {
  if (!state.pieces || state.result) return null;
  const moves = turns(state.pieces, state.turn);
  if (!moves.length) return null;
  if (difficulty === 1) return Math.floor(Math.random() * moves.length);
  function search(board: (Piece | null)[], color: Color, depth: number, alpha: number, beta: number): number {
    const replies = turns(board, color);
    if (!replies.length) return -10000 - depth;
    if (!depth) return evaluate(board, color);
    for (const reply of replies) {
      alpha = Math.max(alpha, -search(reply.pieces, opposite(color), depth - 1, -beta, -alpha));
      if (alpha >= beta) break;
    }
    return alpha;
  }
  let best = -Infinity, choice = 0;
  moves.forEach((move, i) => {
    const score = -search(move.pieces, opposite(state.turn), difficulty - 2, -Infinity, -best);
    if (score > best) { best = score; choice = i; }
  });
  return choice;
}
