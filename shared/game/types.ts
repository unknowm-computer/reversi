export type Color = 'black' | 'white';
export type Cell = Color | null;
export type Character = 'jannabi' | 'grasshopper';
export type Mode = 'ai' | 'local' | 'online';
export type GameType = 'reversi' | 'gomoku' | 'chess' | 'janggi';
export type PieceKind = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn' | 'general' | 'guard' | 'elephant' | 'horse' | 'cannon' | 'soldier';
export interface Piece { color: Color; kind: PieceKind }
export type JanggiFormation = 'outer' | 'inner' | 'left' | 'right';
export interface ChessPosition { fen: string; positionHistory: string[] }
export interface JanggiPosition { positionHistory: string[]; consecutivePasses: number; bikjang: Color | null }
export type UndoLimit = 0 | 1 | 3 | -1;
export type AiDifficulty = 1 | 2 | 3 | 4 | 5;
export const DEFAULT_AI_DIFFICULTY: AiDifficulty = 3;
export const AI_DIFFICULTIES: ReadonlyArray<{ value: AiDifficulty; label: string }> = [
  { value: 1, label: '입문' }, { value: 2, label: '쉬움' }, { value: 3, label: '보통' },
  { value: 4, label: '어려움' }, { value: 5, label: '매우 어려움' },
];
export interface GameSettings {
  /** Omitted legacy settings start a Reversi game. */
  gameType?: GameType;
  mode: Mode;
  seconds: 0 | 30 | 60;
  undoLimit: UndoLimit;
  blackCharacter: Character;
  /** Solo-only; omitted by existing online room snapshots. */
  aiDifficulty?: AiDifficulty;
  janggiBlackFormation?: JanggiFormation;
  janggiWhiteFormation?: JanggiFormation;
}
export interface Score { black: number; white: number; empty: number }
export interface GameResult {
  winner: Color | null;
  reason: 'noLegalMoves' | 'fiveInRow' | 'boardFull' | 'resign' | 'timeout' | 'disconnect' | 'checkmate' | 'stalemate' | 'repetition' | 'fiftyMoves' | 'insufficientMaterial' | 'bikjang' | 'mutualPass';
}
export interface GameState {
  gameType: GameType;
  gameId: string;
  revision: number;
  board: Cell[];
  turn: Color;
  lastMove: number | null;
  /** Gomoku's completed line; empty before a win and in Reversi. */
  winningLine: number[];
  /** Reversi move effects; Gomoku keeps these empty/null. */
  flipped: number[];
  passed: Color | null;
  result: GameResult | null;
  /** For piece-moving games, board remains a color projection for shared scores. */
  pieces?: (Piece | null)[];
  lastFrom?: number | null;
  check?: Color | null;
  chess?: ChessPosition;
  janggi?: JanggiPosition;
}
export interface HistoryEntry { state: GameState; remaining: number; actor: Color }
export type Reaction = 'idle' | 'think' | 'urgent' | 'happy' | 'sad' | 'dance' | 'undo' | 'annoyed' | 'pass' | 'win' | 'lose' | 'draw' | 'sly' | 'whistle';
export const DEFAULT_SETTINGS: GameSettings = { gameType: 'reversi', mode: 'ai', seconds: 30, undoLimit: 1, blackCharacter: 'grasshopper', aiDifficulty: DEFAULT_AI_DIFFICULTY, janggiBlackFormation: 'outer', janggiWhiteFormation: 'outer' };
export const JANGGI_FORMATIONS: ReadonlyArray<{ value: JanggiFormation; label: string }> = [
  { value: 'outer', label: '바깥마 · 마상상마' }, { value: 'inner', label: '안쪽마 · 상마마상' },
  { value: 'left', label: '왼마 · 마상마상' }, { value: 'right', label: '오른마 · 상마상마' },
];
export const gameName = (gameType: GameType = 'reversi'): string => ({ reversi: '리버시', gomoku: '오목', chess: '체스', janggi: '장기' })[gameType];
export const isPieceGame = (gameType: GameType): boolean => gameType === 'chess' || gameType === 'janggi';
/** Internal black/white identify first/second player; chess starts with white. */
export const sideName = (gameType: GameType, color: Color): string => gameType === 'chess' ? (color === 'black' ? '백' : '흑') : gameType === 'janggi' ? (color === 'black' ? '초' : '한') : (color === 'black' ? '흑' : '백');
export const characterName = (character: Character): string => character === 'jannabi' ? '잔나비' : '베짱이';
export const otherCharacter = (character: Character): Character => character === 'jannabi' ? 'grasshopper' : 'jannabi';
export const colorName = (color: Color): string => color === 'black' ? '흑' : '백';

export const TIMEOUT_PENALTY_MS = 2400;
export const TIMEOUT_PENALTY_HIT_MS = 720;
export const TURN_WARNING_MS = 10000;
