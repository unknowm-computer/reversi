import { decodePieceMove, encodePieceMove, JANGGI_PASS } from '../../game/pieces.js';
import { opposite } from '../../game/state.js';
import type { Color, GameSettings, GameState, Piece, PieceKind } from '../../game/types.js';
import { JANGGI_CELL_COUNT, JANGGI_COLUMNS, janggiIndex } from './board.js';
import { JANGGI_FORMATION_PIECES } from './formations.js';

type Pieces = readonly (Piece | null)[];
const ORTHOGONAL: ReadonlyArray<readonly [number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const PALACE_LINES: readonly (readonly number[])[] = [
  [3, 13, 23], [5, 13, 21], [66, 76, 86], [68, 76, 84],
];
const PIECE_KEYS: Partial<Record<PieceKind, string>> = {
  general: 'g', guard: 'a', rook: 'r', cannon: 'c', horse: 'h', elephant: 'e', soldier: 's',
};

/** Position repetition also includes a pending bikjang offer, which changes the legal replies. */
export function positionKey(pieces: Pieces, turn: Color, bikjang: Color | null): string {
  return `${pieces.map(piece => piece ? (piece.color === 'black' ? PIECE_KEYS[piece.kind]?.toUpperCase() : PIECE_KEYS[piece.kind]) : '.').join('')}:${turn}:${bikjang ?? '-'}`;
}

export function initialState(gameId: string, settings?: GameSettings): GameState {
  const pieces = Array<Piece | null>(JANGGI_CELL_COUNT).fill(null);
  for (const color of ['black', 'white'] as const) {
    const bottom = color === 'black';
    const row = bottom ? 9 : 0;
    const formation = (bottom ? settings?.janggiBlackFormation : settings?.janggiWhiteFormation) ?? 'outer';
    // Formation left/right is seen from each player's own side of the board.
    const flankPieces = bottom ? JANGGI_FORMATION_PIECES[formation] : [...JANGGI_FORMATION_PIECES[formation]].reverse();
    const put = (r: number, c: number, kind: PieceKind): void => { pieces[r * JANGGI_COLUMNS + c] = { color, kind }; };
    for (const c of [0, 8]) put(row, c, 'rook');
    for (const c of [3, 5]) put(row, c, 'guard');
    [1, 2, 6, 7].forEach((c, i) => put(row, c, flankPieces[i]));
    put(bottom ? 8 : 1, 4, 'general');
    for (const c of [1, 7]) put(bottom ? 7 : 2, c, 'cannon');
    for (const c of [0, 2, 4, 6, 8]) put(bottom ? 6 : 3, c, 'soldier');
  }
  return {
    gameId, gameType: 'janggi', revision: 0, pieces, board: pieces.map(piece => piece?.color ?? null),
    turn: 'black', lastMove: null, lastFrom: null, flipped: [], passed: null, winningLine: [], result: null, check: null,
    janggi: { positionHistory: [positionKey(pieces, 'black', null)], consecutivePasses: 0, bikjang: null },
  };
}

function insidePalace(index: number, color: Color): boolean {
  const row = Math.floor(index / JANGGI_COLUMNS);
  const col = index % JANGGI_COLUMNS;
  return col >= 3 && col <= 5 && (color === 'black' ? row >= 7 && row <= 9 : row >= 0 && row <= 2);
}

function palaceNeighbours(from: number): number[] {
  return PALACE_LINES.flatMap(line => {
    const i = line.indexOf(from);
    return i < 0 ? [] : [line[i - 1], line[i + 1]].filter((index): index is number => index !== undefined);
  });
}

/** Korea Janggi Association movement rules: https://koreajanggi.cafe24.com/business/business3.php */
function pseudoTargets(pieces: Pieces, from: number): number[] {
  const piece = pieces[from];
  if (!piece) return [];
  const row = Math.floor(from / JANGGI_COLUMNS);
  const col = from % JANGGI_COLUMNS;
  const targets: number[] = [];
  const add = (index: number | null): void => {
    if (index !== null && pieces[index]?.color !== piece.color) targets.push(index);
  };
  if (piece.kind === 'general' || piece.kind === 'guard') {
    for (const [dr, dc] of ORTHOGONAL) {
      const to = janggiIndex(row + dr, col + dc);
      if (to !== null && insidePalace(to, piece.color)) add(to);
    }
    for (const to of palaceNeighbours(from)) if (insidePalace(to, piece.color)) add(to);
  } else if (piece.kind === 'soldier') {
    const forward = piece.color === 'black' ? -1 : 1;
    add(janggiIndex(row + forward, col));
    add(janggiIndex(row, col - 1));
    add(janggiIndex(row, col + 1));
    for (const to of palaceNeighbours(from)) {
      if (insidePalace(to, opposite(piece.color)) && Math.floor(to / JANGGI_COLUMNS) - row === forward) add(to);
    }
  } else if (piece.kind === 'horse' || piece.kind === 'elephant') {
    for (const [dr, dc] of ORTHOGONAL) {
      const first = janggiIndex(row + dr, col + dc);
      if (first === null || pieces[first]) continue;
      for (const side of [-1, 1]) {
        const diagonalRow = dr || side;
        const diagonalCol = dc || side;
        const second = janggiIndex(row + dr + diagonalRow, col + dc + diagonalCol);
        if (piece.kind === 'horse') add(second);
        else if (second !== null && !pieces[second]) add(janggiIndex(row + dr + diagonalRow * 2, col + dc + diagonalCol * 2));
      }
    }
  } else if (piece.kind === 'rook' || piece.kind === 'cannon') {
    const rays: number[][] = ORTHOGONAL.map(([dr, dc]) => {
      const ray: number[] = [];
      for (let step = 1; step < 10; step++) {
        const to = janggiIndex(row + dr * step, col + dc * step);
        if (to === null) break;
        ray.push(to);
      }
      return ray;
    });
    for (const line of PALACE_LINES) {
      const i = line.indexOf(from);
      if (i >= 0) rays.push(line.slice(0, i).reverse(), line.slice(i + 1));
    }
    for (const ray of rays) {
      let screened = piece.kind !== 'cannon';
      for (const to of ray) {
        const target = pieces[to];
        if (!screened) {
          if (target?.kind === 'cannon') break;
          if (target) screened = true;
          continue;
        }
        if (target?.kind !== 'cannon' || piece.kind !== 'cannon') add(to);
        if (target) break;
      }
    }
  }
  return targets;
}

export function isInCheck(pieces: Pieces, color: Color): boolean {
  const general = pieces.findIndex(piece => piece?.kind === 'general' && piece.color === color);
  if (general < 0) return true;
  for (let from = 0; from < pieces.length; from++) {
    if (pieces[from] && pieces[from]?.color !== color && pseudoTargets(pieces, from).includes(general)) return true;
  }
  return false;
}

export function generalsFace(pieces: Pieces): boolean {
  const black = pieces.findIndex(piece => piece?.kind === 'general' && piece.color === 'black');
  const white = pieces.findIndex(piece => piece?.kind === 'general' && piece.color === 'white');
  if (black < 0 || white < 0 || black % JANGGI_COLUMNS !== white % JANGGI_COLUMNS) return false;
  for (let index = Math.min(black, white) + JANGGI_COLUMNS; index < Math.max(black, white); index += JANGGI_COLUMNS) {
    if (pieces[index]) return false;
  }
  return true;
}

export function legalMoves(state: GameState): number[] {
  if (state.result || state.gameType !== 'janggi' || state.pieces?.length !== JANGGI_CELL_COUNT) return [];
  const generals = state.pieces.filter(piece => piece?.kind === 'general');
  if (generals.length !== 2 || !generals.some(piece => piece?.color === 'black') || !generals.some(piece => piece?.color === 'white')) return [];
  const pieces = state.pieces.slice();
  const moves: number[] = [];
  const mustResolveBikjang = state.janggi?.bikjang != null && state.janggi.bikjang !== state.turn && generalsFace(pieces);
  for (let from = 0; from < pieces.length; from++) {
    const piece = pieces[from];
    if (piece?.color !== state.turn) continue;
    for (const to of pseudoTargets(pieces, from)) {
      const captured = pieces[to];
      // The general is never physically captured; a position ends at checkmate.
      if (captured?.kind === 'general') continue;
      pieces[to] = piece;
      pieces[from] = null;
      const legal = !isInCheck(pieces, state.turn) && (!mustResolveBikjang || !generalsFace(pieces));
      pieces[from] = piece;
      pieces[to] = captured;
      if (legal) moves.push(encodePieceMove(from, to));
    }
  }
  if (!isInCheck(pieces, state.turn)) moves.push(JANGGI_PASS);
  return moves;
}

/** Only call with a move returned by legalMoves; AI shares this transition without revalidating it. */
export function advanceLegalMove(state: GameState, code: number): GameState {
  const pieces = state.pieces!.slice();
  const mover = state.turn;
  const turn = opposite(mover);
  const passing = code === JANGGI_PASS;
  const move = passing ? null : decodePieceMove(code)!;
  if (move) {
    pieces[move.to] = pieces[move.from];
    pieces[move.from] = null;
  }
  const consecutivePasses = passing ? (state.janggi?.consecutivePasses ?? 0) + 1 : 0;
  const acceptedBikjang = passing && state.janggi?.bikjang != null && state.janggi.bikjang !== mover && generalsFace(pieces);
  const bikjang = generalsFace(pieces) ? (passing ? state.janggi?.bikjang ?? null : mover) : null;
  const key = positionKey(pieces, turn, bikjang);
  const positionHistory = [...(state.janggi?.positionHistory ?? []), key];
  const result = acceptedBikjang ? { winner: null, reason: 'bikjang' as const }
    : consecutivePasses >= 2 ? { winner: null, reason: 'mutualPass' as const }
      : positionHistory.filter(position => position === key).length >= 3 ? { winner: null, reason: 'repetition' as const } : null;
  return {
    ...state, revision: state.revision + 1, pieces, board: pieces.map(piece => piece?.color ?? null), turn,
    lastMove: move?.to ?? null, lastFrom: move?.from ?? null, passed: passing ? mover : null, flipped: [], winningLine: [],
    check: isInCheck(pieces, turn) ? turn : null, result,
    janggi: { consecutivePasses, positionHistory, bikjang },
  };
}

export function applyMove(state: GameState, code: number): GameState | null {
  if (!legalMoves(state).includes(code)) return null;
  const next = advanceLegalMove(state, code);
  if (!next.result && next.check && legalMoves(next).length === 0) next.result = { winner: state.turn, reason: 'checkmate' };
  return next;
}
