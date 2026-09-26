export type Color = 'black' | 'white';
export type Cell = Color | null;
export type Character = 'jannabi' | 'grasshopper';
export type Mode = 'ai' | 'local' | 'online';
export type UndoLimit = 0 | 1 | 3 | -1;
export type AiDifficulty = 1 | 2 | 3 | 4 | 5;
export const DEFAULT_AI_DIFFICULTY: AiDifficulty = 3;
export const AI_DIFFICULTIES: ReadonlyArray<{ value: AiDifficulty; label: string }> = [
  { value: 1, label: '입문' }, { value: 2, label: '쉬움' }, { value: 3, label: '보통' },
  { value: 4, label: '어려움' }, { value: 5, label: '매우 어려움' },
];
export interface GameSettings {
  mode: Mode;
  seconds: 0 | 30 | 60;
  undoLimit: UndoLimit;
  blackCharacter: Character;
  /** Solo-only; omitted by existing online room snapshots. */
  aiDifficulty?: AiDifficulty;
}
export interface Score { black: number; white: number; empty: number }
export interface GameResult {
  winner: Color | null;
  reason: 'noLegalMoves' | 'resign' | 'timeout' | 'disconnect';
}
export interface GameState {
  gameId: string;
  revision: number;
  board: Cell[];
  turn: Color;
  lastMove: number | null;
  flipped: number[];
  passed: Color | null;
  result: GameResult | null;
}
export interface HistoryEntry { state: GameState; remaining: number; actor: Color }
export type Reaction = 'idle' | 'think' | 'urgent' | 'happy' | 'sad' | 'dance' | 'undo' | 'annoyed' | 'pass' | 'win' | 'lose' | 'draw' | 'sly' | 'whistle';
export const DEFAULT_SETTINGS: GameSettings = { mode: 'ai', seconds: 30, undoLimit: 1, blackCharacter: 'grasshopper', aiDifficulty: DEFAULT_AI_DIFFICULTY };
export const characterName = (character: Character): string => character === 'jannabi' ? '잔나비' : '베짱이';
export const otherCharacter = (character: Character): Character => character === 'jannabi' ? 'grasshopper' : 'jannabi';
export const colorName = (color: Color): string => color === 'black' ? '흑' : '백';

export const TIMEOUT_PENALTY_MS = 2400;
export const TIMEOUT_PENALTY_HIT_MS = 720;
export const TURN_WARNING_MS = 10000;
