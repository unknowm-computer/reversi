import { createServer, type Server as HttpServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import { commandSchema, type ClientEvents, type ServerEvents, type RoomSnapshot, type CommandResponse } from '../shared/protocol.js';
import { applyMove, endGame, initialState } from '../shared/game/rules.js';
import type { Color, GameSettings, GameState } from '../shared/game/types.js';
import { otherCharacter } from '../shared/game/types.js';
interface Player { color: Color; token: string; socketId: string | null; disconnectedAt: number | null; ready: boolean; rematch: boolean }
interface Room { code: string; settings: GameSettings; players: Player[]; game: GameState | null; deadline: number | null; updatedAt: number; revision: number; requests: Map<string, CommandResponse> }
interface SocketData { code?: string; token?: string; windowStart?: number; count?: number }
type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>;
export interface ServerOptions { reconnectMs?: number; idleMs?: number; tickMs?: number; staticRoot?: string; now?: () => number }
export function createGameServer(options: ServerOptions = {}): { http: HttpServer; io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>; close: () => Promise<void> } {
  const rooms = new Map<string, Room>();
  const nowMillis = options.now ?? Date.now;
  const expired = new Map<string, number>();
  const addressLimits = new Map<string, { at: number; count: number }>();
  const staticRoot = resolve(options.staticRoot ?? 'dist');
  const http = createServer(async (req, res) => {
    if (req.url === '/health') { res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}'); return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
      let filename = resolve(staticRoot, `.${pathname}`);
      if (filename !== staticRoot && !filename.startsWith(staticRoot + sep)) { res.writeHead(403); res.end(); return; }
      try { if (!(await stat(filename)).isFile()) filename = resolve(staticRoot, 'index.html'); }
      catch { filename = resolve(staticRoot, 'index.html'); }
      const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
      res.setHeader('Content-Type', mime[extname(filename)] ?? 'application/octet-stream');
      res.end(await readFile(filename));
    } catch { res.writeHead(404); res.end('Run npm run build first, or open the Vite dev server.'); }
  });
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>(http, { maxHttpBufferSize: 8192 });
  function snapshot(room: Room): RoomSnapshot {
    return { code: room.code, settings: room.settings, players: room.players.map(({ color, socketId, ready, rematch }) => ({ color, connected: socketId !== null, ready, rematch })), game: room.game, deadline: room.deadline, serverNow: nowMillis(), revision: room.revision };
  }
  function publish(room: Room): void { room.revision++; io.to(room.code).emit('room:state', snapshot(room)); }
  function start(room: Room): void {
    room.game = initialState(randomUUID());
    room.deadline = room.settings.seconds ? nowMillis() + room.settings.seconds * 1000 : null;
    for (const player of room.players) player.rematch = false;
    room.requests.clear();
  }
  function removeRoom(room: Room, message: string): void {
    io.to(room.code).emit('room:closed', message);
    for (const p of room.players) {
      const client = p.socketId ? io.sockets.sockets.get(p.socketId) : undefined;
      if (client) { void client.leave(room.code); delete client.data.code; delete client.data.token; }
    }
    rooms.delete(room.code); expired.set(room.code, nowMillis());
  }
  function settle(room: Room, now: number): void {
    const grace = options.reconnectMs ?? 30000;
    if (room.players.length === 2 && room.players.every(p => p.disconnectedAt !== null && now - p.disconnectedAt >= grace)) {
      removeRoom(room, '두 플레이어의 연결이 종료되었습니다.'); return;
    }
    if (room.game && !room.game.result) {
      const lost = room.players.filter(p => p.disconnectedAt !== null).sort((a, b) => a.disconnectedAt! - b.disconnectedAt!)[0];
      const lostAt = lost?.disconnectedAt !== null && lost?.disconnectedAt !== undefined ? lost.disconnectedAt + grace : Infinity;
      const timeoutAt = room.deadline ?? Infinity;
      if (now >= Math.min(lostAt, timeoutAt)) {
        room.game = timeoutAt <= lostAt ? endGame(room.game, room.game.turn, 'timeout') : endGame(room.game, lost.color, 'disconnect');
        room.deadline = null; room.updatedAt = now; publish(room);
      }
    }
    if ((!room.game || room.game.result) && now - room.updatedAt >= (options.idleMs ?? 600000)) removeRoom(room, '활동이 없어 방이 만료되었습니다.');
  }
  io.on('connection', (socket: GameSocket) => {
    socket.on('command', (input, ack) => {
      if (typeof ack !== 'function') return;
      const now = nowMillis();
      if (!socket.data.windowStart || now - socket.data.windowStart > 5000) { socket.data.windowStart = now; socket.data.count = 0; }
      socket.data.count = (socket.data.count ?? 0) + 1;
      const reject = (errorCode: string, error: string): void => ack({ ok: false, errorCode, error });
      if (socket.data.count > 40) { reject('RATE_LIMIT', '요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.'); return; }
      const parsed = commandSchema.safeParse(input);
      if (!parsed.success) { reject('INVALID_COMMAND', '올바르지 않은 요청입니다.'); return; }
      const command = parsed.data;
      if (command.type === 'create' || command.type === 'join' || command.type === 'resume') {
        const address = socket.handshake.address;
        const limit = addressLimits.get(address) ?? { at: now, count: 0 };
        if (now - limit.at > 60000) { limit.at = now; limit.count = 0; }
        limit.count++; addressLimits.set(address, limit);
        if (limit.count > 60) { reject('RATE_LIMIT', '방 접속 시도가 많습니다. 1분 후 다시 시도해 주세요.'); return; }
        if (socket.data.code) { reject('ALREADY_JOINED', '현재 방을 나간 후 다시 시도해 주세요.'); return; }
        let room: Room | undefined;
        let player: Player;
        if (command.type === 'create') {
          if (rooms.size >= 1000) { reject('CAPACITY', '현재 방이 많습니다. 잠시 후 다시 시도해 주세요.'); return; }
          let code: string;
          const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code) || expired.has(code));
          player = { color: 'black', token: randomUUID(), socketId: socket.id, disconnectedAt: null, ready: false, rematch: false };
          room = { code, settings: command.settings, players: [player], game: null, deadline: null, updatedAt: now, revision: 0, requests: new Map() };
          rooms.set(code, room);
        } else {
          room = rooms.get(command.code);
          if (!room) { reject(expired.has(command.code) ? 'ROOM_EXPIRED' : 'ROOM_NOT_FOUND', expired.has(command.code) ? '만료된 방입니다.' : '방 코드를 다시 확인해 주세요.'); return; }
          settle(room, now);
          if (!rooms.has(room.code)) { reject('ROOM_EXPIRED', '만료된 방입니다.'); return; }
          if (command.type === 'resume') {
            const existing = room.players.find(p => p.token === command.token);
            if (!existing) { reject('INVALID_SESSION', '이 방에 복귀할 수 없는 세션입니다.'); return; }
            if (existing.socketId && existing.socketId !== socket.id) {
              const previous = io.sockets.sockets.get(existing.socketId);
              if (previous) { delete previous.data.code; delete previous.data.token; previous.emit('room:closed', '다른 창에서 이 세션에 접속했습니다.'); void previous.leave(room.code); }
            }
            player = existing; player.socketId = socket.id; player.disconnectedAt = null;
          } else {
            if (room.players.length >= 2) { reject('ROOM_FULL', '이미 두 명이 있는 방입니다.'); return; }
            player = { color: 'white', token: randomUUID(), socketId: socket.id, disconnectedAt: null, ready: false, rematch: false }; room.players.push(player);
          }
        }
        room.updatedAt = now; socket.data.code = room.code; socket.data.token = player.token;
        void socket.join(room.code); publish(room);
        ack({ ok: true, token: player.token, color: player.color, room: snapshot(room) }); return;
      }
      const room = socket.data.code ? rooms.get(socket.data.code) : undefined;
      const player = room?.players.find(p => p.token === socket.data.token && p.socketId === socket.id);
      if (!room || !player) { reject('NO_SESSION', '방에 먼저 접속해 주세요.'); return; }
      settle(room, now);
      if (!rooms.has(room.code)) { reject('ROOM_EXPIRED', '만료된 방입니다.'); return; }
      const key = `${player.token}:${command.requestId}`;
      const previous = room.requests.get(key);
      if (previous) { ack({ ...previous, room: snapshot(room) }); return; }
      if (command.type === 'leave') { removeRoom(room, '플레이어가 방을 나갔습니다.'); ack({ ok: true }); return; }
      if (command.type === 'character') {
        if (room.game || room.players.some(p => p.ready)) { reject('SETTINGS_LOCKED', '준비 완료 전까지만 캐릭터를 바꿀 수 있어요.'); return; }
        room.settings.blackCharacter = player.color === 'black' ? command.character : otherCharacter(command.character);
      } else if (command.type === 'ready') {
        if (room.game) { reject('ALREADY_STARTED', '이미 시작한 대국입니다.'); return; }
        player.ready = true;
        if (room.players.length === 2 && room.players.every(p => p.ready && p.socketId)) start(room);
      } else {
        if (!room.game || room.game.gameId !== command.gameId || room.game.revision !== command.expectedRevision) {
          ack({ ok: false, errorCode: 'STALE_STATE', error: '최신 대국 상태를 반영했습니다. 다시 시도해 주세요.', room: snapshot(room) }); return;
        }
        if (command.type === 'move') {
          if (room.game.turn !== player.color || room.players.some(p => !p.socketId)) { reject('NOT_YOUR_TURN', '지금은 착수할 수 없습니다.'); return; }
          const next = applyMove(room.game, command.index);
          if (!next) { reject('ILLEGAL_MOVE', '이 칸에는 돌을 놓을 수 없습니다.'); return; }
          room.game = next;
          room.deadline = !next.result && room.settings.seconds ? now + room.settings.seconds * 1000 : null;
        } else if (command.type === 'resign') {
          if (room.game.result) { reject('GAME_FINISHED', '이미 종료된 대국입니다.'); return; }
          room.game = endGame(room.game, player.color, 'resign'); room.deadline = null;
        } else if (command.type === 'rematch') {
          if (!room.game.result) { reject('GAME_PLAYING', '대국 종료 후 다시 할 수 있습니다.'); return; }
          player.rematch = true;
          if (room.players.length === 2 && room.players.every(p => p.rematch && p.socketId)) start(room);
        }
      }
      room.updatedAt = now; publish(room);
      const response: CommandResponse = { ok: true, room: snapshot(room) };
      room.requests.set(key, response);
      if (room.requests.size > 256) room.requests.delete(room.requests.keys().next().value!);
      ack(response);
    });
    socket.on('disconnect', () => {
      const room = socket.data.code ? rooms.get(socket.data.code) : undefined;
      const player = room?.players.find(p => p.socketId === socket.id);
      if (room && player) { player.socketId = null; player.disconnectedAt = nowMillis(); if (!room.game) player.ready = false; publish(room); }
    });
  });
  const timer = setInterval(() => {
    const now = nowMillis();
    for (const room of rooms.values()) settle(room, now);
    for (const [code, at] of expired) if (now - at > 3600000) expired.delete(code);
    for (const [ip, limit] of addressLimits) if (now - limit.at > 60000) addressLimits.delete(ip);
  }, options.tickMs ?? 250);
  timer.unref();
  return { http, io, close: async () => { clearInterval(timer); await new Promise<void>(done => io.close(() => done())); } };
}
