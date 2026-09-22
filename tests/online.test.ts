import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createGameServer } from '../server/app';
import { DEFAULT_SETTINGS } from '../shared/game/types';
import { legalMoves } from '../shared/game/rules';
import type { ClientEvents, ServerEvents, Command, CommandResponse, RoomSnapshot } from '../shared/protocol';
type Client = Socket<ServerEvents, ClientEvents>;
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });
async function setup(reconnectMs = 30000, seconds: 0 | 30 | 60 = 0) {
  let now = Date.now();
  const app = createGameServer({ reconnectMs, tickMs: 10, idleMs: 600000, now: () => now });
  const realTime = setInterval(() => { now += 10; }, 10);
  await new Promise<void>(done => app.http.listen(0, '127.0.0.1', done));
  const url = `http://127.0.0.1:${(app.http.address() as AddressInfo).port}`;
  const clients: Client[] = [];
  async function connect(): Promise<Client> {
    const socket: Client = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    clients.push(socket); await new Promise<void>(done => socket.on('connect', done)); return socket;
  }
  cleanups.push(async () => { clearInterval(realTime); clients.forEach(socket => socket.disconnect()); await app.close(); });
  const black = await connect(), white = await connect();
  const created = await command(black, { type: 'create', requestId: randomUUID(), settings: { ...DEFAULT_SETTINGS, mode: 'online', seconds, undoLimit: 0 } });
  const joined = await command(white, { type: 'join', requestId: randomUUID(), code: created.room!.code });
  await command(black, { type: 'ready', requestId: randomUUID() });
  const ready = await command(white, { type: 'ready', requestId: randomUUID() });
  return { black, white, created, joined, room: ready.room!, connect, app, advance: (ms: number): void => { now += ms; } };
}
function command(socket: Client, data: Command): Promise<CommandResponse> { return socket.timeout(3000).emitWithAck('command', data); }
function nextState(socket: Client, predicate: (room: RoomSnapshot) => boolean): Promise<RoomSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off('room:state', listener); reject(new Error('state timeout')); }, 3000);
    const listener = (room: RoomSnapshot): void => { if (predicate(room)) { clearTimeout(timeout); socket.off('room:state', listener); resolve(room); } };
    socket.on('room:state', listener);
  });
}
describe('Authoritative online games', () => {
  it('synchronizes both players and rejects turn theft, invalid moves, stale and duplicate requests', async () => {
    const { black, white, room } = await setup();
    const base = { gameId: room.game!.gameId, expectedRevision: 0 };
    expect((await command(white, { type: 'move', ...base, requestId: randomUUID(), index: 19 })).errorCode).toBe('NOT_YOUR_TURN');
    expect((await command(black, { type: 'move', ...base, requestId: randomUUID(), index: 0 })).errorCode).toBe('ILLEGAL_MOVE');
    const request: Command = { type: 'move', ...base, requestId: randomUUID(), index: 19 };
    const sync = nextState(white, room => room.game?.revision === 1);
    const accepted = await command(black, request);
    expect((await sync).game).toEqual(accepted.room!.game);
    expect((await command(black, request)).room!.game!.revision).toBe(1);
    expect((await command(white, { type: 'move', ...base, requestId: randomUUID(), index: 18 })).errorCode).toBe('STALE_STATE');
  });
  it('rejects a third player and invalid resume tokens', async () => {
    const { connect, room } = await setup(); const third = await connect();
    expect((await command(third, { type: 'join', requestId: randomUUID(), code: room.code })).errorCode).toBe('ROOM_FULL');
    expect((await command(third, { type: 'resume', requestId: randomUUID(), code: room.code, token: randomUUID() })).errorCode).toBe('INVALID_SESSION');
  });
  it('resumes the same board using a secret session token', async () => {
    const { black, white, created, room, connect } = await setup();
    const disconnected = nextState(white, room => !room.players[0].connected); black.disconnect(); await disconnected;
    const replacement = await connect();
    const response = await command(replacement, { type: 'resume', requestId: randomUUID(), code: room.code, token: created.token! });
    expect(response.ok).toBe(true); expect(response.room!.game).toEqual(room.game); expect(response.color).toBe('black');
  });
  it('finishes the game when the reconnection grace expires', async () => {
    const { black, white } = await setup(60);
    const ended = nextState(white, room => room.game?.result?.reason === 'disconnect'); black.disconnect();
    expect((await ended).game!.result!.winner).toBe('white');
  });
  it('requires both players to consent before a rematch', async () => {
    const { black, white, room } = await setup();
    const resigned = await command(black, { type: 'resign', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: 0 });
    const base = { gameId: room.game!.gameId, expectedRevision: resigned.room!.game!.revision };
    const first = await command(black, { type: 'rematch', requestId: randomUUID(), ...base });
    expect(first.room!.game!.result).not.toBeNull();
    const second = await command(white, { type: 'rematch', requestId: randomUUID(), ...base });
    expect(second.room!.game!.result).toBeNull(); expect(second.room!.game!.gameId).not.toBe(base.gameId);
  });
  it('plays an entire game with identical results for both clients', async () => {
    const { black, white, room } = await setup(); let game = room.game!;
    while (!game.result) {
      const player = game.turn === 'black' ? black : white;
      const observer = game.turn === 'black' ? white : black;
      const revision = game.revision + 1;
      const sync = nextState(observer, state => state.game?.revision === revision);
      const response = await command(player, { type: 'move', requestId: randomUUID(), gameId: game.gameId, expectedRevision: game.revision, index: legalMoves(game.board, game.turn)[0] });
      expect(response.ok).toBe(true); game = response.room!.game!;
      expect((await sync).game).toEqual(game);
    }
    expect(game.result.reason).toBe('noLegalMoves');
  });
  it('rejects unknown commands such as online undo', async () => {
    const { black } = await setup();
    const result = await command(black, { type: 'undo', requestId: randomUUID() } as unknown as Command);
    expect(result.errorCode).toBe('INVALID_COMMAND');
  });
  it('rejects a deadline move and lets only the opponent end the game', async () => {
    const { black, white, room, advance } = await setup(30000, 30);
    advance(30001);
    const response = await command(black, { type: 'move', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: 0, index: 19 });
    expect(response.ok).toBe(false); expect(response.room!.game!.result).toBeNull();
    expect(response.room!.timeout).toEqual({ phase: 'decision', loser: 'black' }); expect(response.room!.deadline).toBeNull();
    expect(response.room!.game!.lastMove).toBeNull();
    const choice: Command = { type: 'timeout-choice', choice: 'end', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: response.room!.game!.revision };
    expect((await command(black, choice)).errorCode).toBe('NOT_DECIDER');
    const ended = await command(white, choice);
    expect(ended.room!.game!.result).toEqual({ winner: 'white', reason: 'timeout' }); expect(ended.room!.timeout).toBeNull();
  });
  it('keeps the server timer running during disconnection', async () => {
    const { black, white, advance } = await setup(30000, 30);
    advance(10000); const disconnected = nextState(white, state => !state.players[0].connected); black.disconnect(); await disconnected;
    const pending = nextState(white, state => state.timeout?.phase === 'decision'); advance(21000);
    const decision = await pending; expect(decision.game!.result).toBeNull(); expect(decision.deadline).toBeNull();
    const denied = await command(white, { type: 'timeout-choice', choice: 'forgive', requestId: randomUUID(), gameId: decision.game!.gameId, expectedRevision: decision.game!.revision });
    expect(denied.errorCode).toBe('PLAYER_DISCONNECTED');
    const ended = nextState(white, state => state.game?.result?.reason === 'disconnect'); advance(10000);
    expect((await ended).timeout).toBeNull();
  });
  it('closes a room after both players remain disconnected beyond the grace period', async () => {
    const { black, white, room, created, connect, advance } = await setup(100);
    const disconnected = nextState(white, state => !state.players[0].connected); black.disconnect(); await disconnected;
    white.disconnect();
    const reconnect = await connect(); advance(1000);
    const result = await command(reconnect, { type: 'resume', requestId: randomUUID(), code: room.code, token: created.token! });
    expect(result.errorCode).toBe('ROOM_EXPIRED');
  });
});


describe('Online timeout forgiveness', () => {
  it('synchronizes the penalty, blocks moves and duplicate decisions, and restarts the same turn', async () => {
    const { black, white, room, advance } = await setup(30000, 30);
    const waiting = nextState(white, state => state.timeout?.phase === 'decision'); advance(30001); const pending = await waiting;
    const base = { gameId: room.game!.gameId, expectedRevision: pending.game!.revision };
    expect((await command(black, { type: 'move', index: 19, requestId: randomUUID(), ...base })).errorCode).toBe('TIMEOUT_PENDING');
    const synced = nextState(black, state => state.timeout?.phase === 'penalty');
    const request: Command = { type: 'timeout-choice', choice: 'forgive', requestId: randomUUID(), ...base };
    const response = await command(white, request); const penalty = await synced;
    expect(penalty).toEqual(response.room); expect(penalty.game!.board).toEqual(room.game!.board); expect(penalty.game!.turn).toBe('black');
    expect(penalty.deadline).toBeNull(); expect(penalty.game!.result).toBeNull();
    const duplicate = await command(white, request); expect(duplicate.room!.timeout).toEqual(penalty.timeout);
    expect((await command(white, { ...request, requestId: randomUUID() })).errorCode).toBe('STALE_STATE');
    expect((await command(black, { type: 'move', index: 19, requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: penalty.game!.revision })).errorCode).toBe('TIMEOUT_PENDING');
    const resumed = nextState(white, state => state.timeout === null && state.game!.revision > penalty.game!.revision); advance(2400);
    const ready = await resumed; expect(ready.game!.turn).toBe('black');
    expect(ready.deadline! - ready.serverNow).toBeGreaterThan(29900); expect(ready.deadline! - ready.serverNow).toBeLessThanOrEqual(30000);
    const moved = await command(black, { type: 'move', index: 19, requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: ready.game!.revision }); expect(moved.ok).toBe(true);
    const again = nextState(black, state => state.timeout?.phase === 'decision'); advance(30001); expect((await again).timeout?.loser).toBe('white');
  });
  it('restores the pending choice after the deciding player reconnects', async () => {
    const { black, white, room, joined, connect, advance } = await setup(30000, 30);
    const waiting = nextState(white, state => state.timeout?.phase === 'decision'); advance(30001); await waiting;
    const disconnected = nextState(black, state => !state.players[1].connected); white.disconnect(); await disconnected;
    const replacement = await connect();
    const restored = await command(replacement, { type: 'resume', requestId: randomUUID(), code: room.code, token: joined.token! });
    expect(restored.room!.timeout).toEqual({ phase: 'decision', loser: 'black' }); expect(restored.room!.game!.result).toBeNull();
    const ended = await command(replacement, { type: 'timeout-choice', choice: 'end', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: restored.room!.game!.revision });
    expect(ended.room!.game!.result).toEqual({ winner: 'white', reason: 'timeout' });
  });
});

describe('Timeout penalty reconnect', () => {
  it('restores the server penalty deadline rather than restarting the animation period', async () => {
    const { black, white, room, created, connect, advance } = await setup(30000, 60);
    const waiting = nextState(white, state => state.timeout?.phase === 'decision'); advance(60001); const pending = await waiting;
    const response = await command(white, { type: 'timeout-choice', choice: 'forgive', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: pending.game!.revision });
    const original = response.room!.timeout;
    const disconnected = nextState(white, state => !state.players[0].connected); black.disconnect(); await disconnected;
    advance(1000); const replacement = await connect();
    const restored = await command(replacement, { type: 'resume', requestId: randomUUID(), code: room.code, token: created.token! });
    expect(restored.room!.timeout).toEqual(original);
    expect(restored.room!.deadline).toBeNull(); expect(restored.room!.game!.board).toEqual(room.game!.board);
    const resumed = nextState(white, state => !state.timeout); advance(1500); const ready = await resumed;
    expect(ready.deadline! - ready.serverNow).toBeGreaterThan(59800);
    expect(ready.game!.turn).toBe('black'); expect(ready.game!.result).toBeNull();
  });
});
