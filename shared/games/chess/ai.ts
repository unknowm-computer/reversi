import type { Chess, Move, PieceSymbol } from 'chess.js';
import type { AiDifficulty, GameState } from '../../game/types.js';
import { chessFromState, moveCode, positionKey } from './rules.js';

const VALUES: Record<PieceSymbol, number> = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
const MATE = 100000;

/** A small positional bonus develops pieces without overwhelming material or mate. */
function evaluate(chess: Chess): number {
  const board = chess.board();
  const material = board.flat().reduce((total, piece) => total + (piece && piece.type !== 'p' ? VALUES[piece.type] : 0), 0);
  let value = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      const advancement = piece.color === 'w' ? 6 - row : row - 1;
      const centrality = 7 - Math.abs(col - 3.5) - Math.abs(row - 3.5);
      let positional = 0;
      switch (piece.type) {
        case 'p': positional = advancement * 9 + (3.5 - Math.abs(col - 3.5)) * 5; break;
        case 'n': positional = centrality * 12; break;
        case 'b': positional = centrality * 7; break;
        case 'r': positional = advancement * 2; break;
        case 'q': positional = centrality * 3; break;
        case 'k': positional = material < 2000 ? centrality * 10 : -centrality * 5 + ([1, 2, 6].includes(col) && (row === 0 || row === 7) ? 25 : 0); break;
      }
      value += (piece.color === 'w' ? 1 : -1) * (VALUES[piece.type] + positional);
    }
  }
  return chess.turn() === 'w' ? value : -value;
}

function priority(move: Move): number {
  return (move.captured ? 10 * VALUES[move.captured] - VALUES[move.piece] : 0)
    + (move.promotion ? VALUES[move.promotion] + 1000 : 0)
    + (move.flags.includes('k') || move.flags.includes('q') ? 35 : 0)
    + (move.san.includes('+') ? 25 : 0);
}

function searchMove(state: GameState, budgetMs: number, maxDepth: number, quiescenceDepth: number): number | null {
  if (state.result) return null;
  const chess = chessFromState(state);
  if (!chess) return null;
  const candidates = chess.moves({ verbose: true }).sort((a, b) => priority(b) - priority(a));
  if (!candidates.length) return null;
  const deadline = performance.now() + budgetMs;
  const timedOut = Symbol('chess search deadline');
  const repetitions = new Map<string, number>();
  for (const key of state.chess?.positionHistory ?? [positionKey(chess)]) repetitions.set(key, (repetitions.get(key) ?? 0) + 1);

  function search(depth: number, alpha: number, beta: number, ply: number, quietDepth: number): number {
    if (performance.now() >= deadline) throw timedOut;
    const moves = chess!.moves({ verbose: true });
    const checked = chess!.isCheck();
    if (!moves.length) return checked ? -MATE + ply : 0;
    if (chess!.isInsufficientMaterial() || chess!.isDrawByFiftyMoves() || (repetitions.get(positionKey(chess!)) ?? 0) >= 3) return 0;
    if (depth <= 0) {
      const standPat = evaluate(chess!);
      if (quietDepth <= 0) return standPat;
      if (!checked) {
        if (standPat >= beta) return standPat;
        alpha = Math.max(alpha, standPat);
      }
      const tactical = checked ? moves : moves.filter(move => move.captured || move.promotion);
      if (!tactical.length) return standPat;
      for (const move of tactical.sort((a, b) => priority(b) - priority(a))) {
        const value = visit(move, 0, -beta, -alpha, ply + 1, quietDepth - 1);
        if (value >= beta) return value;
        alpha = Math.max(alpha, value);
      }
      return alpha;
    }
    for (const move of moves.sort((a, b) => priority(b) - priority(a))) {
      const value = visit(move, depth - 1, -beta, -alpha, ply + 1, quietDepth);
      if (value >= beta) return value;
      alpha = Math.max(alpha, value);
    }
    return alpha;
  }

  /** Always restore the mutable search board, including when a deadline interrupts a branch. */
  function visit(move: Move, depth: number, alpha: number, beta: number, ply: number, quietDepth: number): number {
    chess!.move(move);
    const key = positionKey(chess!);
    repetitions.set(key, (repetitions.get(key) ?? 0) + 1);
    try {
      return -search(depth, alpha, beta, ply, quietDepth);
    } finally {
      const count = repetitions.get(key)! - 1;
      if (count) repetitions.set(key, count); else repetitions.delete(key);
      chess!.undo();
    }
  }

  let best = candidates[0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    let iterationBest = best;
    let bestValue = -Infinity;
    try {
      for (const candidate of [best, ...candidates.filter(move => move !== best)]) {
        const value = visit(candidate, depth - 1, -Infinity, -bestValue, 1, quiescenceDepth);
        if (value > bestValue) { bestValue = value; iterationBest = candidate; }
      }
      best = iterationBest;
      if (bestValue >= MATE - 64) break;
    } catch (error: unknown) {
      if (error !== timedOut) throw error;
      break;
    }
  }
  return moveCode(best);
}

export function chooseDifficultyMove(state: GameState, difficulty: AiDifficulty): number | null {
  if (state.result) return null;
  if (difficulty === 1) {
    const moves = chessFromState(state)?.moves({ verbose: true }) ?? [];
    return moves.length ? moveCode(moves[Math.floor(Math.random() * moves.length)]) : null;
  }
  const levels = {
    2: { depth: 1, budget: 100, quiet: 0 },
    3: { depth: 2, budget: 220, quiet: 1 },
    4: { depth: 4, budget: 450, quiet: 2 },
    5: { depth: 6, budget: 850, quiet: 3 },
  } as const;
  const level = levels[difficulty];
  return searchMove(state, level.budget, level.depth, level.quiet);
}
