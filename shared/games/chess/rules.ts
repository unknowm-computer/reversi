import { Chess, type Color as ChessColor, type Move, type PieceSymbol, type Square } from 'chess.js';
import { decodePieceMove, encodePieceMove, type Promotion } from '../../game/pieces.js';
import type { Color, GameResult, GameState, Piece, PieceKind } from '../../game/types.js';

const PIECE_KINDS: Record<PieceSymbol, PieceKind> = {
  k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn',
};
const PROMOTION_SYMBOLS: Record<Promotion, PieceSymbol> = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' };
const PROMOTION_KINDS: Partial<Record<PieceSymbol, Promotion>> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };

/** Shared colors identify players: the first player (black) owns the white chess pieces. */
export const playerColor = (color: ChessColor): Color => color === 'w' ? 'black' : 'white';
export const squareIndex = (square: Square): number => (8 - Number(square[1])) * 8 + square.charCodeAt(0) - 97;
export const indexSquare = (index: number): Square => `${String.fromCharCode(97 + index % 8)}${8 - Math.floor(index / 8)}` as Square;
export const moveCode = (move: Move): number => encodePieceMove(squareIndex(move.from), squareIndex(move.to), move.promotion ? PROMOTION_KINDS[move.promotion] : 'queen');

/** Castling and en-passant rights are part of a repetition position; clocks are not. */
export const positionKey = (chess: Chess): string => chess.fen().split(' ').slice(0, 4).join(' ');

export function chessFromState(state: GameState): Chess | null {
  if (state.gameType !== 'chess' || !state.chess) return null;
  try {
    const chess = new Chess(state.chess.fen);
    return playerColor(chess.turn()) === state.turn ? chess : null;
  } catch {
    return null;
  }
}

function piecesFromChess(chess: Chess): (Piece | null)[] {
  return chess.board().flatMap(row => row.map(piece => piece ? { color: playerColor(piece.color), kind: PIECE_KINDS[piece.type] } : null));
}

export function initialState(gameId: string): GameState {
  const chess = new Chess();
  const pieces = piecesFromChess(chess);
  return {
    gameType: 'chess', gameId, revision: 0, board: pieces.map(piece => piece?.color ?? null), pieces,
    turn: 'black', lastMove: null, lastFrom: null, check: null,
    flipped: [], passed: null, winningLine: [], result: null,
    chess: { fen: chess.fen(), positionHistory: [positionKey(chess)] },
  };
}

export function legalMoves(state: GameState): number[] {
  if (state.result) return [];
  const chess = chessFromState(state);
  return chess ? chess.moves({ verbose: true }).map(moveCode) : [];
}

function resultAfterMove(chess: Chess, history: readonly string[]): GameResult | null {
  if (chess.isCheckmate()) return { winner: playerColor(chess.turn() === 'w' ? 'b' : 'w'), reason: 'checkmate' };
  if (chess.isStalemate()) return { winner: null, reason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { winner: null, reason: 'insufficientMaterial' };
  if (chess.isDrawByFiftyMoves()) return { winner: null, reason: 'fiftyMoves' };
  if (history.filter(key => key === positionKey(chess)).length >= 3) return { winner: null, reason: 'repetition' };
  return null;
}

export function applyMove(state: GameState, code: number): GameState | null {
  if (state.result) return null;
  const decoded = decodePieceMove(code);
  if (!decoded || decoded.from >= 64 || decoded.to >= 64) return null;
  const chess = chessFromState(state);
  if (!chess) return null;
  const candidate = chess.moves({ verbose: true }).find(move => moveCode(move) === code);
  if (!candidate) return null;
  chess.move({ from: candidate.from, to: candidate.to, ...(candidate.promotion ? { promotion: PROMOTION_SYMBOLS[decoded.promotion] } : {}) });
  const pieces = piecesFromChess(chess);
  const positionHistory = [...(state.chess?.positionHistory ?? []), positionKey(chess)];
  const turn = playerColor(chess.turn());
  return {
    ...state, revision: state.revision + 1, board: pieces.map(piece => piece?.color ?? null), pieces, turn,
    lastFrom: decoded.from, lastMove: decoded.to, check: chess.isCheck() ? turn : null,
    flipped: [], passed: null, winningLine: [], result: resultAfterMove(chess, positionHistory),
    chess: { fen: chess.fen(), positionHistory },
  };
}
