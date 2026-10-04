import type { PieceKind } from './types.js';

export const PIECE_MOVE_BASE = 1000;
export const PIECE_MOVE_STRIDE = 90;
export const PIECE_MOVE_PLANE = PIECE_MOVE_STRIDE * PIECE_MOVE_STRIDE;
export const JANGGI_PASS = 999;
export const MAX_MOVE_CODE = PIECE_MOVE_BASE + 4 * PIECE_MOVE_PLANE - 1;
export type Promotion = 'queen' | 'rook' | 'bishop' | 'knight';
export const PROMOTIONS: readonly Promotion[] = ['queen', 'rook', 'bishop', 'knight'];
export interface PieceMove { from: number; to: number; promotion: Promotion }

export function encodePieceMove(from: number, to: number, promotion: Promotion = 'queen'): number {
  return PIECE_MOVE_BASE + PROMOTIONS.indexOf(promotion) * PIECE_MOVE_PLANE + from * PIECE_MOVE_STRIDE + to;
}
export function decodePieceMove(code: number): PieceMove | null {
  if (!Number.isInteger(code) || code < PIECE_MOVE_BASE || code > MAX_MOVE_CODE) return null;
  const value = code - PIECE_MOVE_BASE;
  const squareMove = value % PIECE_MOVE_PLANE;
  return { from: Math.floor(squareMove / PIECE_MOVE_STRIDE), to: squareMove % PIECE_MOVE_STRIDE, promotion: PROMOTIONS[Math.floor(value / PIECE_MOVE_PLANE)] };
}
export const pieceName = (kind: PieceKind): string => ({ king: '킹', queen: '퀸', rook: '룩', bishop: '비숍', knight: '나이트', pawn: '폰', general: '궁', guard: '사', elephant: '상', horse: '마', cannon: '포', soldier: '졸' })[kind];
