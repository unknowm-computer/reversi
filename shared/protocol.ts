import { z } from 'zod';
import type { Color, GameSettings, GameState } from './game/types.js';
const settingsSchema = z.object({
  mode: z.literal('online'), seconds: z.union([z.literal(0), z.literal(30), z.literal(60)]),
  undoLimit: z.literal(0), blackCharacter: z.enum(['jannabi', 'grasshopper']),
});
const identity = { requestId: z.string().uuid() };
const gameIdentity = { ...identity, gameId: z.string().uuid(), expectedRevision: z.number().int().nonnegative() };
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), ...identity, settings: settingsSchema }),
  z.object({ type: z.literal('join'), ...identity, code: z.string().regex(/^[A-Z2-9]{6}$/) }),
  z.object({ type: z.literal('resume'), ...identity, code: z.string().regex(/^[A-Z2-9]{6}$/), token: z.string().uuid() }),
  z.object({ type: z.literal('ready'), ...identity }),
  z.object({ type: z.literal('character'), ...identity, character: z.enum(['jannabi', 'grasshopper']) }),
  z.object({ type: z.literal('move'), ...gameIdentity, index: z.number().int().min(0).max(63) }),
  z.object({ type: z.literal('resign'), ...gameIdentity }),
  z.object({ type: z.literal('rematch'), ...gameIdentity }),
  z.object({ type: z.literal('leave'), ...identity }),
]);
export type Command = z.infer<typeof commandSchema>;
export interface RoomPlayer { color: Color; connected: boolean; ready: boolean; rematch: boolean }
export interface RoomSnapshot {
  code: string;
  settings: GameSettings;
  players: RoomPlayer[];
  game: GameState | null;
  deadline: number | null;
  serverNow: number;
  revision: number;
}
export interface CommandResponse {
  ok: boolean;
  error?: string;
  errorCode?: string;
  token?: string;
  color?: Color;
  room?: RoomSnapshot;
}
export interface ServerEvents { 'room:state': (room: RoomSnapshot) => void; 'room:closed': (message: string) => void }
export interface ClientEvents { command: (command: Command, callback: (response: CommandResponse) => void) => void }
