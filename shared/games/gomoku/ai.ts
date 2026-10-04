import { opposite } from '../../game/state.js';
import type { AiDifficulty, Cell, Color, GameState } from '../../game/types.js';
import { GOMOKU_CELL_COUNT, GOMOKU_DIRECTIONS, GOMOKU_SIZE } from './board.js';
import { isForbiddenMove, legalMoves } from './rules.js';

const CENTER = Math.floor(GOMOKU_SIZE / 2);
const WIN = 100_000_000;
interface Candidate { index: number; attack: number; defense: number; value: number }
interface SearchLevel { depth: number; breadth: number; budgetMs: number }
const LEVELS: Record<AiDifficulty, SearchLevel> = {
  1: { depth: 0, breadth: 8, budgetMs: 0 },
  2: { depth: 0, breadth: 1, budgetMs: 0 },
  3: { depth: 2, breadth: 8, budgetMs: 140 },
  4: { depth: 3, breadth: 10, budgetMs: 300 },
  5: { depth: 4, breadth: 12, budgetMs: 550 },
};

function inside(row: number, col: number): boolean {
  return row >= 0 && row < GOMOKU_SIZE && col >= 0 && col < GOMOKU_SIZE;
}

/** Score the lines a stone would create without changing the board. */
function placementValue(board: readonly Cell[], index: number, color: Color): number {
  const row = Math.floor(index / GOMOKU_SIZE);
  const col = index % GOMOKU_SIZE;
  let value = 0;
  for (const [dr, dc] of GOMOKU_DIRECTIONS) {
    let connected = 1;
    let openEnds = 0;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (inside(r, c) && board[r * GOMOKU_SIZE + c] === color) {
        connected++;
        r += dr * sign;
        c += dc * sign;
      }
      if (inside(r, c) && board[r * GOMOKU_SIZE + c] === null) openEnds++;
    }
    if (connected === 5) return WIN;
    if (openEnds) {
      const open = openEnds === 2;
      if (connected === 4) value += open ? 120_000 : 28_000;
      else if (connected === 3) value += open ? 7_000 : 1_000;
      else if (connected === 2) value += open ? 450 : 60;
      else value += open ? 20 : 5;
    }
    // Five-cell windows also recognize broken threes/fours with an internal gap.
    for (let offset = -4; offset <= 0; offset++) {
      let stones = 0;
      let blocked = false;
      for (let step = 0; step < 5; step++) {
        const r = row + (offset + step) * dr;
        const c = col + (offset + step) * dc;
        if (!inside(r, c)) { blocked = true; break; }
        const point = r * GOMOKU_SIZE + c;
        const cell = point === index ? color : board[point];
        if (cell === color) stones++;
        else if (cell !== null) { blocked = true; break; }
      }
      if (!blocked) value += stones === 4 ? 11_000 : stones === 3 ? 650 : stones === 2 ? 35 : 1;
    }
  }
  return value;
}

function nearbyMoves(board: readonly Cell[]): number[] {
  const candidates = new Set<number>();
  for (let index = 0; index < GOMOKU_CELL_COUNT; index++) {
    if (board[index] === null) continue;
    const row = Math.floor(index / GOMOKU_SIZE);
    const col = index % GOMOKU_SIZE;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (inside(r, c) && board[r * GOMOKU_SIZE + c] === null) candidates.add(r * GOMOKU_SIZE + c);
    }
  }
  return [...candidates];
}

function rankMoves(board: readonly Cell[], color: Color): Candidate[] {
  const enemy = opposite(color);
  return nearbyMoves(board).filter(index => !isForbiddenMove(board, index, color)).map((index): Candidate => {
    const attack = placementValue(board, index, color);
    // A forbidden fork or overline is not an available threat for the opponent either.
    const defense = isForbiddenMove(board, index, enemy) ? 0 : placementValue(board, index, enemy);
    const centerBonus = 14 - Math.abs(Math.floor(index / GOMOKU_SIZE) - CENTER) - Math.abs(index % GOMOKU_SIZE - CENTER);
    return { index, attack, defense, value: Math.max(attack, defense * 1.05) + Math.min(attack, defense) * 0.15 + centerBonus };
  }).sort((a, b) => b.value - a.value || a.index - b.index);
}

function searchOptions(candidates: readonly Candidate[], breadth: number): readonly Candidate[] {
  const wins = candidates.filter(move => move.attack >= WIN);
  if (wins.length) return wins;
  const defenses = candidates.filter(move => move.defense >= WIN);
  return defenses.length ? defenses : candidates.slice(0, breadth);
}

export function chooseDifficultyMove(state: GameState, difficulty: AiDifficulty): number | null {
  if (state.result || state.board.length !== GOMOKU_CELL_COUNT || !state.board.includes(null)) return null;
  if (state.board.every(cell => cell === null)) return CENTER * GOMOKU_SIZE + CENTER;
  const ranked = rankMoves(state.board, state.turn);
  const win = ranked.find(move => move.attack >= WIN);
  if (win) return win.index;
  // Even the entry level notices an immediate win or a single move to prevent defeat.
  const defense = ranked.find(move => move.defense >= WIN);
  if (defense) return defense.index;
  const level = LEVELS[difficulty];
  const candidates = ranked.slice(0, level.breadth);
  if (!candidates.length) return null;
  if (difficulty === 1) return candidates[Math.floor(Math.random() * candidates.length)].index;
  if (difficulty === 2) return candidates[0].index;

  const board = [...state.board];
  const deadline = performance.now() + level.budgetMs;
  const timeout = Symbol('gomoku search budget');
  function search(color: Color, depth: number, alpha: number, beta: number, ply: number): number {
    if (performance.now() >= deadline) throw timeout;
    const moves = rankMoves(board, color);
    if (!moves.length) {
      // Nearby candidate pruning alone does not prove that the player has no legal move.
      if (legalMoves(board, color).length) return 0;
      return legalMoves(board, opposite(color)).length ? -WIN + ply : 0;
    }
    if (moves.some(move => move.attack >= WIN)) return WIN - ply;
    if (moves.filter(move => move.defense >= WIN).length > 1) return -WIN + ply + 1;
    if (depth === 0) {
      const attack = Math.max(...moves.map(move => move.attack));
      const defense = Math.max(...moves.map(move => move.defense));
      // A heuristic threat must never outweigh a proven win deeper in the search.
      return Math.max(-WIN / 2, Math.min(WIN / 2, attack - defense * 1.1));
    }
    let value = -Infinity;
    for (const move of searchOptions(moves, level.breadth)) {
      if (performance.now() >= deadline) throw timeout;
      board[move.index] = color;
      let next: number;
      try { next = -search(opposite(color), depth - 1, -beta, -alpha, ply + 1); }
      finally { board[move.index] = null; }
      value = Math.max(value, next);
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  // Commit a new best move only after a full depth; an interrupted iteration retains a valid choice.
  let best = candidates[0].index;
  for (let depth = 1; depth <= level.depth; depth++) {
    let candidate = best;
    let value = -Infinity;
    const ordered = [...candidates].sort((a, b) => Number(b.index === best) - Number(a.index === best));
    try {
      for (const move of ordered) {
        if (performance.now() >= deadline) throw timeout;
        board[move.index] = state.turn;
        let next: number;
        try { next = -search(opposite(state.turn), depth - 1, -Infinity, -value, 1); }
        finally { board[move.index] = null; }
        if (next > value) { value = next; candidate = move.index; }
      }
      best = candidate;
      if (value >= WIN - 20) break;
    } catch (error: unknown) {
      if (error !== timeout) throw error;
      break;
    }
  }
  return best;
}
