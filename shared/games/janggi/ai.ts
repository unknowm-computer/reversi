import { decodePieceMove, JANGGI_PASS } from '../../game/pieces.js';
import type { AiDifficulty, Color, GameState, PieceKind } from '../../game/types.js';
import { advanceLegalMove, legalMoves } from './rules.js';

const MATE = 1_000_000;
const VALUES: Partial<Record<PieceKind, number>> = {
  general: 20_000, rook: 1_300, cannon: 700, horse: 500, elephant: 300, guard: 300, soldier: 200,
};
const SEARCH_LIMITS: Record<AiDifficulty, { depth: number; nodes: number; milliseconds: number }> = {
  1: { depth: 0, nodes: 0, milliseconds: 0 },
  2: { depth: 1, nodes: 200, milliseconds: 80 },
  3: { depth: 2, nodes: 1_800, milliseconds: 180 },
  4: { depth: 3, nodes: 6_000, milliseconds: 420 },
  5: { depth: 4, nodes: 18_000, milliseconds: 900 },
};
interface SearchContext { deadline: number; maxNodes: number; nodes: number; stopped: boolean }

function evaluate(state: GameState, perspective: Color): number {
  let score = 0;
  state.pieces?.forEach((piece, index) => {
    if (!piece) return;
    const row = Math.floor(index / 9);
    const col = index % 9;
    const advance = piece.color === 'black' ? 9 - row : row;
    const centrality = 4 - Math.abs(col - 4);
    let positional = 0;
    if (piece.kind === 'soldier') positional = advance * 8 + centrality * 5;
    else if (piece.kind === 'horse' || piece.kind === 'elephant') positional = Math.min(advance, 5) * 5 + centrality * 4;
    else if (piece.kind === 'rook') positional = Math.min(advance, 6) * 3;
    else if (piece.kind === 'general') positional = (col === 4 ? 8 : 0) - Math.max(0, advance - 1) * 8;
    score += (piece.color === perspective ? 1 : -1) * ((VALUES[piece.kind] ?? 0) + positional);
  });
  return score;
}

function orderedMoves(state: GameState, moves: number[], preferred?: number): number[] {
  const score = (code: number): number => {
    if (code === preferred) return MATE;
    if (code === JANGGI_PASS) return -10_000;
    const move = decodePieceMove(code)!;
    const captured = state.pieces?.[move.to];
    const piece = state.pieces?.[move.from];
    const capture = captured ? (VALUES[captured.kind] ?? 0) * 10 - (VALUES[piece!.kind] ?? 0) : 0;
    const development = piece?.kind === 'horse' || piece?.kind === 'rook' || piece?.kind === 'soldier'
      ? (Math.floor(move.from / 9) - Math.floor(move.to / 9)) * (state.turn === 'black' ? 3 : -3) : 0;
    return capture + development;
  };
  return moves.map(code => ({ code, value: score(code) })).sort((a, b) => b.value - a.value).map(move => move.code);
}

function search(state: GameState, depth: number, alpha: number, beta: number, ply: number, context: SearchContext): number {
  context.nodes++;
  if (context.nodes > context.maxNodes || Date.now() >= context.deadline) {
    context.stopped = true;
    return evaluate(state, state.turn);
  }
  if (state.result) return state.result.winner === null ? 0 : state.result.winner === state.turn ? MATE - ply : -MATE + ply;
  // Detect mate even on a leaf, so a mating move always outranks material.
  if (depth === 0 && !state.check) return evaluate(state, state.turn);
  const moves = legalMoves(state);
  if (!moves.length) return state.check ? -MATE + ply : 0;
  if (depth === 0) return evaluate(state, state.turn);
  let best = -Infinity;
  for (const move of orderedMoves(state, moves)) {
    const value = -search(advanceLegalMove(state, move), depth - 1, -beta, -alpha, ply + 1, context);
    if (context.stopped) return value;
    best = Math.max(best, value);
    alpha = Math.max(alpha, value);
    if (alpha >= beta) break;
  }
  return best;
}

/** Bounded iterative deepening keeps the worker responsive even in wide, open positions. */
export function chooseDifficultyMove(state: GameState, difficulty: AiDifficulty): number | null {
  const moves = legalMoves(state);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (difficulty === 1) {
    const active = moves.filter(move => move !== JANGGI_PASS);
    return active[Math.floor(Math.random() * active.length)] ?? JANGGI_PASS;
  }
  const limits = SEARCH_LIMITS[difficulty];
  const context: SearchContext = { deadline: Date.now() + limits.milliseconds, maxNodes: limits.nodes, nodes: 0, stopped: false };
  let best = orderedMoves(state, moves)[0];
  for (let depth = 1; depth <= limits.depth; depth++) {
    let iterationBest = best;
    let iterationScore = -Infinity;
    for (const move of orderedMoves(state, moves, best)) {
      const value = -search(advanceLegalMove(state, move), depth - 1, -Infinity, -iterationScore, 1, context);
      if (context.stopped) break;
      if (value > iterationScore) {
        iterationScore = value;
        iterationBest = move;
      }
    }
    // Incomplete iterations must not replace a fully searched result.
    if (context.stopped) break;
    best = iterationBest;
    if (iterationScore > MATE / 2) break;
  }
  return best;
}
