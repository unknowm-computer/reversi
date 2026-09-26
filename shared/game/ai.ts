import { applyMove, legalMoves, opposite, score } from './rules.js';
import type { AiDifficulty, Color, GameState } from './types.js';
const CORNERS = [0, 7, 56, 63];
const ADJACENT = [[1, 8, 9], [6, 14, 15], [48, 49, 57], [54, 55, 62]];
function evaluate(state: GameState, color: Color): number {
  const counts = score(state.board);
  const difference = counts[color] - counts[opposite(color)];
  if (state.result) return difference === 0 ? 0 : Math.sign(difference) * 100000 + difference;
  let value = difference * (counts.empty < 16 ? 5 : 0.4);
  value += 8 * (legalMoves(state.board, color).length - legalMoves(state.board, opposite(color)).length);
  CORNERS.forEach((corner, n) => {
    const owner = state.board[corner];
    if (owner) value += owner === color ? 120 : -120;
    else for (const cell of ADJACENT[n]) if (state.board[cell]) value += state.board[cell] === color ? -30 : 30;
  });
  return value;
}
export function chooseMove(state: GameState, budgetMs = 600, maxDepth = 6): number | null {
  const moves = legalMoves(state.board, state.turn);
  if (!moves.length || state.result) return null;
  const deadline = performance.now() + budgetMs;
  const perspective = state.turn;
  const timedOut = Symbol('time budget');
  function search(node: GameState, depth: number, alpha: number, beta: number): number {
    if (performance.now() >= deadline) throw timedOut;
    if (depth === 0 || node.result) return evaluate(node, perspective);
    const maximizing = node.turn === perspective;
    let value = maximizing ? -Infinity : Infinity;
    const options = legalMoves(node.board, node.turn).sort((a, b) => Number(CORNERS.includes(b)) - Number(CORNERS.includes(a)));
    for (const move of options) {
      const next = applyMove(node, move);
      if (!next) continue;
      const result = search(next, depth - 1, alpha, beta);
      value = maximizing ? Math.max(value, result) : Math.min(value, result);
      if (maximizing) alpha = Math.max(alpha, value); else beta = Math.min(beta, value);
      if (beta <= alpha) break;
    }
    return value;
  }
  let best = moves[0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    let candidate = best, value = -Infinity;
    try {
      for (const move of [best, ...moves.filter(move => move !== best)]) {
        const next = applyMove(state, move);
        if (!next) continue;
        const result = search(next, depth - 1, -Infinity, Infinity);
        if (result > value) { value = result; candidate = move; }
      }
      best = candidate;
    } catch (error: unknown) { if (error !== timedOut) throw error; break; }
  }
  return best;
}

export function chooseDifficultyMove(state: GameState, difficulty: AiDifficulty): number | null {
  if (difficulty === 1) {
    const moves = legalMoves(state.board, state.turn);
    return state.result || !moves.length ? null : moves[Math.floor(Math.random() * moves.length)];
  }
  const levels = {
    2: { depth: 1, budgetMs: 100 },
    3: { depth: 2, budgetMs: 200 },
    4: { depth: 4, budgetMs: 400 },
    5: { depth: 6, budgetMs: 600 },
  } as const;
  const level = levels[difficulty];
  return chooseMove(state, level.budgetMs, level.depth);
}
