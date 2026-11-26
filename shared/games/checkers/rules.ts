import { opposite } from '../../game/state.js';
import type { Color, GameState, Piece } from '../../game/types.js';

type Board = (Piece | null)[];
export interface Turn { path: number[]; pieces: Board }

function offset(square: number, dx: number, dy: number): number {
  const x = square % 8 + dx, y = Math.floor(square / 8) + dy;
  return x < 0 || x >= 8 || y < 0 || y >= 8 ? -1 : y * 8 + x;
}

export function step(board: Board, from: number, to: number): Board {
  const pieces = board.slice();
  const piece = pieces[from]!;
  pieces[from] = null;
  if (Math.abs(to % 8 - from % 8) === 2) pieces[(from + to) / 2] = null;
  const crown = piece.color === 'black' ? to < 8 : to >= 56;
  pieces[to] = crown ? { ...piece, kind: 'king' } : piece;
  return pieces;
}

/** Stable square/direction order gives each complete legal turn a wire index for this revision. */
export function turns(board: Board, color: Color): Turn[] {
  const jumps: Turn[] = [], walks: Turn[] = [];
  function visit(pieces: Board, path: number[]): void {
    const from = path[path.length - 1], piece = pieces[from]!;
    const rows = piece.kind === 'king' ? [-1, 1] : [color === 'black' ? -1 : 1];
    let extended = false;
    for (const dy of rows) {
      for (const dx of [-1, 1]) {
        const near = offset(from, dx, dy);
        if (near < 0) continue;
        if (!pieces[near]) {
          if (path.length === 1 && !jumps.length) walks.push({ path: [from, near], pieces: step(pieces, from, near) });
          continue;
        }
        const to = offset(near, dx, dy);
        if (pieces[near]?.color === color || to < 0 || pieces[to]) continue;
        extended = true;
        const next = step(pieces, from, to);
        const route = [...path, to];
        if (piece.kind !== next[to]!.kind) jumps.push({ path: route, pieces: next });
        else visit(next, route);
      }
    }
    if (path.length > 1 && !extended) jumps.push({ path, pieces });
  }
  board.forEach((piece, from) => { if (piece?.color === color) visit(board, [from]); });
  return jumps.length ? jumps : walks;
}

function key(board: Board, color: Color): string {
  return color + board.map(p => !p ? '.' : p.color === 'black' ? (p.kind === 'king' ? 'B' : 'b') : (p.kind === 'king' ? 'W' : 'w')).join('');
}

export function initialState(gameId: string): GameState {
  const pieces: Board = Array.from({ length: 64 }, (_, i) => {
    const row = Math.floor(i / 8);
    if ((row + i % 8) % 2 === 0 || (row >= 3 && row <= 4)) return null;
    return { color: row < 3 ? 'white' : 'black', kind: 'pawn' };
  });
  return { gameId, gameType: 'checkers', revision: 0, turn: 'black', pieces, board: pieces.map(p => p?.color ?? null),
    lastFrom: null, lastMove: null, passed: null, flipped: [], winningLine: [], result: null,
    checkers: { positionHistory: [key(pieces, 'black')], quietPlies: 0 } };
}

export function applyMove(state: GameState, index: number): GameState | null {
  const history = state.checkers;
  if (!history || !state.pieces || state.result) return null;
  const move = turns(state.pieces, state.turn)[index];
  if (!move) return null;
  const { pieces, path } = move;
  const from = path[0], to = path[path.length - 1], turn = opposite(state.turn);
  const quiet = state.pieces[from]?.kind === 'king' && Math.abs(path[1] % 8 - from % 8) === 1;
  const quietPlies = quiet ? history.quietPlies + 1 : 0;
  const position = key(pieces, turn);
  const positionHistory = [...history.positionHistory, position];
  let result: GameState['result'] = null;
  if (!turns(pieces, turn).length) result = { winner: state.turn, reason: 'noLegalMoves' };
  else if (positionHistory.filter(entry => entry === position).length >= 3) result = { winner: null, reason: 'repetition' };
  else if (quietPlies >= 80) result = { winner: null, reason: 'fortyMoves' };
  return { ...state, pieces, board: pieces.map(p => p?.color ?? null), turn, revision: state.revision + 1,
    lastFrom: from, lastMove: to, checkers: { quietPlies, positionHistory }, result };
}
