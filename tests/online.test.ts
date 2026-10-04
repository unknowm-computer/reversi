import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createGameServer } from '../server/app';
import { DEFAULT_SETTINGS, type GameType } from '../shared/game/types';
import { legalMoves } from '../shared/games/reversi/rules';
import { legalMoves as legalGomokuMoves } from '../shared/games/gomoku/rules';
import { GOMOKU_BLOCKED_DRAW_MOVES, GOMOKU_BLOCKED_WIN_MOVES } from './fixtures/gomoku-blocked-sequence';
import type { ClientEvents, ServerEvents, Command, CommandResponse, RoomSnapshot } from '../shared/protocol';
type Client = Socket<ServerEvents, ClientEvents>;
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });
async function setup(reconnectMs = 30000, seconds: 0 | 30 | 60 = 0, gameType: GameType = 'reversi') {
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
  const created = await command(black, { type: 'create', requestId: randomUUID(), settings: { ...DEFAULT_SETTINGS, gameType, mode: 'online', seconds, undoLimit: 0 } });
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
async function enterRematchSetup(black: Client, white: Client, room: RoomSnapshot): Promise<RoomSnapshot> {
  const game = room.game!;
  const finished = game.result ? room : (await command(black, {
    type: 'resign', requestId: randomUUID(), gameId: game.gameId, expectedRevision: game.revision,
  })).room!;
  const base = { type: 'rematch' as const, gameId: game.gameId, expectedRevision: finished.game!.revision };
  await command(black, { ...base, requestId: randomUUID() });
  const response = await command(white, { ...base, requestId: randomUUID() });
  expect(response.ok).toBe(true);
  expect(response.room!.rematchSetup).toBe('editing');
  return response.room!;
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
  it('requires consent, settings confirmation and guest readiness before starting a fresh rematch timer', async () => {
    const { black, white, room, advance } = await setup(30000, 30);
    const resigned = await command(black, { type: 'resign', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: 0 });
    const base = { gameId: room.game!.gameId, expectedRevision: resigned.room!.game!.revision };
    const first = await command(black, { type: 'rematch', requestId: randomUUID(), ...base });
    expect(first.room!.game!.result).not.toBeNull();
    expect(first.room!.rematchSetup).toBeNull();
    const synced = nextState(black, snapshot => snapshot.rematchSetup === 'editing');
    const second = await command(white, { type: 'rematch', requestId: randomUUID(), ...base });
    expect(await synced).toEqual(second.room);
    expect(second.room!.game).toBeNull();
    expect(second.room!.deadline).toBeNull();
    expect(second.room!.timeout).toBeNull();
    expect(second.room!.settings).toEqual(room.settings);
    expect(second.room!.players.every(player => !player.ready && !player.rematch)).toBe(true);
    for (const client of [black, white]) expect((await command(client, { type: 'ready', requestId: randomUUID() })).errorCode).toBe('SETTINGS_PENDING');

    advance(60001);
    const confirmed = await command(black, {
      type: 'configure-rematch', requestId: randomUUID(), expectedRoomRevision: second.room!.revision,
      settings: { ...room.settings, mode: 'online', undoLimit: 0, seconds: 60 },
    });
    expect(confirmed.ok).toBe(true);
    expect(confirmed.room!.rematchSetup).toBe('ready');
    expect(confirmed.room!.game).toBeNull();
    expect(confirmed.room!.deadline).toBeNull();
    expect(confirmed.room!.players.map(player => player.ready)).toEqual([true, false]);
    advance(60001);
    const ready = await command(white, { type: 'ready', requestId: randomUUID() });
    expect(ready.room!.game!.result).toBeNull();
    expect(ready.room!.game!.gameId).not.toBe(base.gameId);
    expect(ready.room!.rematchSetup).toBeNull();
    expect(ready.room!.settings.seconds).toBe(60);
    expect(ready.room!.deadline! - ready.room!.serverNow).toBe(60000);
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

describe('Online rematch settings', () => {
  it('allows only the host to configure a rematch and preserves the room game and characters', async () => {
    const { black, white, room } = await setup();
    const settings = { ...room.settings, mode: 'online' as const, undoLimit: 0 as const };
    const activeRequest: Command = { type: 'configure-rematch', requestId: randomUUID(), expectedRoomRevision: room.revision, settings };
    expect((await command(black, activeRequest)).errorCode).toBe('SETTINGS_LOCKED');
    const editing = await enterRematchSetup(black, white, room);
    const request: Command = { ...activeRequest, requestId: randomUUID(), expectedRoomRevision: editing.revision };
    expect((await command(white, request)).errorCode).toBe('NOT_HOST');
    for (const client of [black, white]) {
      expect((await command(client, { type: 'character', requestId: randomUUID(), character: 'grasshopper' })).errorCode).toBe('SETTINGS_LOCKED');
    }
    for (const invalid of [
      { ...settings, gameType: 'gomoku' as const },
      { ...settings, blackCharacter: settings.blackCharacter === 'jannabi' ? 'grasshopper' as const : 'jannabi' as const },
    ]) {
      expect((await command(black, { ...request, requestId: randomUUID(), settings: invalid })).errorCode).toBe('INVALID_SETTINGS');
    }
    for (const invalid of [{ ...settings, seconds: 15 }, { ...settings, undoLimit: 3 }, { ...settings, mode: 'local' }]) {
      expect((await command(black, { ...request, requestId: randomUUID(), settings: invalid } as unknown as Command)).errorCode).toBe('INVALID_COMMAND');
    }
    const stale = await command(black, { ...request, expectedRoomRevision: editing.revision - 1 });
    expect(stale.errorCode).toBe('STALE_ROOM');
    expect(stale.room).toEqual({ ...editing, serverNow: stale.room!.serverNow });
    const accepted = await command(black, request);
    expect(accepted.ok).toBe(true);
    expect(accepted.room!.settings).toEqual(settings);
    expect(accepted.room!.code).toBe(room.code);
  });

  it('does not publish or start again when consent and settings requests are retried', async () => {
    const { black, white, room } = await setup();
    const resigned = await command(black, { type: 'resign', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: 0 });
    const base = { type: 'rematch' as const, gameId: room.game!.gameId, expectedRevision: resigned.room!.game!.revision };
    const hostRequest: Command = { ...base, requestId: randomUUID() };
    const guestRequest: Command = { ...base, requestId: randomUUID() };
    await command(black, hostRequest);
    const editing = (await command(white, guestRequest)).room!;
    for (const [client, request] of [[black, hostRequest], [white, guestRequest]] as const) {
      const duplicate = await command(client, request);
      expect(duplicate.ok).toBe(true);
      expect(duplicate.room!.revision).toBe(editing.revision);
      expect(duplicate.room!.rematchSetup).toBe('editing');
    }
    const configure: Command = {
      type: 'configure-rematch', requestId: randomUUID(), expectedRoomRevision: editing.revision,
      settings: { ...editing.settings, mode: 'online', undoLimit: 0, seconds: 60 },
    };
    const confirmed = await command(black, configure);
    const duplicate = await command(black, configure);
    expect(duplicate.ok).toBe(true);
    expect(duplicate.room).toEqual({ ...confirmed.room, serverNow: duplicate.room!.serverNow });
    const stale = await command(black, { ...configure, requestId: randomUUID() });
    expect(stale.errorCode).toBe('STALE_ROOM');
    expect(stale.room!.rematchSetup).toBe('ready');
    expect((await command(black, { ...configure, requestId: randomUUID(), expectedRoomRevision: confirmed.room!.revision })).errorCode).toBe('SETTINGS_LOCKED');
    expect(confirmed.room!.game).toBeNull();
  });

  it('restores editing after reconnect and requires fresh readiness when a confirmed host disconnects', async () => {
    const { black, white, room, created, joined, connect, advance } = await setup();
    const editing = await enterRematchSetup(black, white, room);
    const guestDisconnected = nextState(black, snapshot => !snapshot.players[1].connected);
    white.disconnect();
    await guestDisconnected;
    const newGuest = await connect();
    const restored = await command(newGuest, { type: 'resume', requestId: randomUUID(), code: room.code, token: joined.token! });
    expect(restored.room!.rematchSetup).toBe('editing');
    expect(restored.room!.game).toBeNull();
    const stale = await command(black, {
      type: 'configure-rematch', requestId: randomUUID(), expectedRoomRevision: editing.revision,
      settings: { ...editing.settings, mode: 'online', undoLimit: 0, seconds: 30 },
    });
    expect(stale.errorCode).toBe('STALE_ROOM');
    const confirmed = await command(black, {
      type: 'configure-rematch', requestId: randomUUID(), expectedRoomRevision: restored.room!.revision,
      settings: { ...editing.settings, mode: 'online', undoLimit: 0, seconds: 30 },
    });
    expect(confirmed.room!.players[0].ready).toBe(true);
    const hostDisconnected = nextState(newGuest, snapshot => !snapshot.players[0].connected);
    black.disconnect();
    const disconnected = await hostDisconnected;
    expect(disconnected.players[0].ready).toBe(false);
    const guestReady = await command(newGuest, { type: 'ready', requestId: randomUUID() });
    expect(guestReady.room!.game).toBeNull();
    expect(guestReady.room!.deadline).toBeNull();
    advance(31000);
    const newHost = await connect();
    const resumed = await command(newHost, { type: 'resume', requestId: randomUUID(), code: room.code, token: created.token! });
    expect(resumed.room!.rematchSetup).toBe('ready');
    expect(resumed.room!.players.map(player => player.ready)).toEqual([false, true]);
    expect(resumed.room!.game).toBeNull();
    const started = await command(newHost, { type: 'ready', requestId: randomUUID() });
    expect(started.room!.rematchSetup).toBeNull();
    expect(started.room!.game!.result).toBeNull();
    expect(started.room!.deadline! - started.room!.serverNow).toBe(30000);
  });
});


describe('Online timeout forgiveness', () => {
  it.each(['reversi', 'gomoku'] as const)('synchronizes the %s penalty, blocks moves and duplicate decisions, and restarts the same turn', async gameType => {
    const { black, white, room, advance } = await setup(30000, 30, gameType);
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

describe('Online game selection', () => {
  it.each([
    { outcome: 'opponent win', moves: GOMOKU_BLOCKED_WIN_MOVES, winner: 'white' },
    { outcome: 'draw', moves: GOMOKU_BLOCKED_DRAW_MOVES, winner: null },
  ] as const)('synchronizes a blocked Gomoku $outcome, stops the timer and rejects further moves', async ({ moves, winner }) => {
    const { black, white, room, advance } = await setup(30000, 60, 'gomoku');
    let current = room;
    for (const [moveNumber, index] of moves.entries()) {
      // Advance the server clock between batches to respect its request rate limit.
      if (moveNumber > 0 && moveNumber % 30 === 0) advance(5001);
      const state = current.game!;
      expect(state.result).toBeNull();
      const synced = Promise.all([
        nextState(black, snapshot => snapshot.game?.revision === state.revision + 1),
        nextState(white, snapshot => snapshot.game?.revision === state.revision + 1),
      ]);
      const response = await command(state.turn === 'black' ? black : white, {
        type: 'move', requestId: randomUUID(), gameId: state.gameId, expectedRevision: state.revision, index,
      });
      expect(response.ok).toBe(true);
      current = response.room!;
      expect(await synced).toEqual([current, current]);
    }

    const finished = current.game!;
    expect(finished.result).toEqual({ winner, reason: 'noLegalMoves' });
    expect(finished.board).toContain(null);
    expect(finished.winningLine).toEqual([]);
    expect(legalGomokuMoves(finished.board, finished.turn)).toEqual([]);
    expect(legalGomokuMoves(finished.board, 'white').length > 0).toBe(winner !== null);
    expect(current.deadline).toBeNull();
    expect(current.timeout).toBeNull();

    // Even after the former deadline passes, both clients keep the final result.
    advance(60001);
    const request: Command = {
      type: 'move', requestId: randomUUID(), gameId: finished.gameId,
      expectedRevision: finished.revision, index: finished.board.indexOf(null),
    };
    expect((await command(black, request)).errorCode).toBe('ILLEGAL_MOVE');
    expect((await command(white, { ...request, requestId: randomUUID() })).errorCode).toBe('NOT_YOUR_TURN');
    for (const player of [black, white]) {
      const inspected = await command(player, {
        ...request, requestId: randomUUID(), expectedRevision: finished.revision + 1,
      });
      expect(inspected.errorCode).toBe('STALE_STATE');
      expect(inspected.room).toEqual({ ...current, serverNow: inspected.room!.serverNow });
    }
  });

  it('keeps Reversi moves inside its own 64-cell board', async () => {
    const { black, room } = await setup();
    const response = await command(black, { type: 'move', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: 0, index: 224 });
    expect(response.errorCode).toBe('INVALID_COMMAND');
    expect(room.game!.board).toHaveLength(64);
  });

  it('synchronizes a Gomoku win and rematches with the same game and settings', async () => {
    const { black, white, room } = await setup(30000, 60, 'gomoku');
    expect(room.settings.gameType).toBe('gomoku');
    expect(room.game!.board).toEqual(Array(225).fill(null));
    let state = room.game!;
    for (const index of [112, 0, 113, 2, 114, 4, 115, 6, 116]) {
      const current = state;
      const observer = current.turn === 'black' ? white : black;
      const sync = nextState(observer, snapshot => snapshot.game?.revision === current.revision + 1);
      const response = await command(current.turn === 'black' ? black : white, {
        type: 'move', requestId: randomUUID(), gameId: current.gameId, expectedRevision: current.revision, index,
      });
      expect(response.ok).toBe(true);
      state = response.room!.game!;
      expect((await sync).game).toEqual(state);
    }
    expect(state.result).toEqual({ winner: 'black', reason: 'fiveInRow' });
    expect(state.winningLine).toEqual([112, 113, 114, 115, 116]);
    const base = { type: 'rematch' as const, gameId: state.gameId, expectedRevision: state.revision };
    await command(black, { ...base, requestId: randomUUID() });
    const editing = await command(white, { ...base, requestId: randomUUID() });
    expect(editing.room!.game).toBeNull();
    await command(black, {
      type: 'configure-rematch', requestId: randomUUID(), expectedRoomRevision: editing.room!.revision,
      settings: { ...editing.room!.settings, mode: 'online', undoLimit: 0 },
    });
    const response = await command(white, { type: 'ready', requestId: randomUUID() });
    expect(response.room!.settings.gameType).toBe('gomoku');
    expect(response.room!.settings.seconds).toBe(60);
    expect(response.room!.game!.board).toEqual(Array(225).fill(null));
    expect(response.room!.game!.winningLine).toEqual([]);
    expect(response.room!.game!.gameId).not.toBe(state.gameId);
  });

  it('restores Gomoku edge moves after reconnect and rejects occupied intersections', async () => {
    const { black, white, room, created, connect } = await setup(30000, 0, 'gomoku');
    const moved = await command(black, { type: 'move', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: 0, index: 224 });
    expect(moved.ok).toBe(true);
    const occupied = await command(white, { type: 'move', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: 1, index: 224 });
    expect(occupied.errorCode).toBe('ILLEGAL_MOVE');
    const disconnected = nextState(white, state => !state.players[0].connected);
    black.disconnect(); await disconnected;
    const replacement = await connect();
    const restored = await command(replacement, { type: 'resume', requestId: randomUUID(), code: room.code, token: created.token! });
    expect(restored.room!.game).toEqual(moved.room!.game);
    expect(restored.room!.settings.gameType).toBe('gomoku');
  });

  it.each([
    { rule: 'double-three', color: 'black', forbiddenIndex: 112, moves: [111, 0, 113, 2, 97, 4, 127, 6] },
    { rule: 'double-three', color: 'white', forbiddenIndex: 112, moves: [0, 111, 2, 113, 4, 97, 6, 127, 8] },
    { rule: 'double-four', color: 'black', forbiddenIndex: 112, moves: [111, 0, 113, 2, 114, 4, 97, 6, 127, 8, 142, 10] },
    { rule: 'double-four', color: 'white', forbiddenIndex: 112, moves: [0, 111, 2, 113, 4, 114, 6, 97, 8, 127, 10, 142, 12] },
    { rule: 'overline', color: 'black', forbiddenIndex: 114, moves: [111, 0, 112, 2, 113, 4, 115, 6, 116, 8] },
    { rule: 'overline', color: 'white', forbiddenIndex: 114, moves: [0, 111, 2, 112, 4, 113, 6, 115, 8, 116, 10] },
  ] as const)('rejects a $color $rule without changing either client or the turn timer', async ({ color, forbiddenIndex, moves }) => {
    const { black, white, room } = await setup(30000, 60, 'gomoku');
    let current = room;
    // The threes/fours intersect at H8; the overline fills J8 in G8-I8 + K8-L8.
    // The other player makes legal, separated moves along the top edge.
    for (const index of moves) {
      const state = current.game!;
      const revision = state.revision + 1;
      const synced = Promise.all([
        nextState(black, snapshot => snapshot.game?.revision === revision),
        nextState(white, snapshot => snapshot.game?.revision === revision),
      ]);
      const response = await command(state.turn === 'black' ? black : white, {
        type: 'move', requestId: randomUUID(), gameId: state.gameId, expectedRevision: state.revision, index,
      });
      expect(response.ok).toBe(true);
      current = response.room!;
      expect(current.game!.result).toBeNull();
      expect(await synced).toEqual([current, current]);
    }

    const before = current;
    const state = before.game!;
    expect(state.turn).toBe(color);
    expect(before.deadline).not.toBeNull();
    const blackUpdates: RoomSnapshot[] = [];
    const whiteUpdates: RoomSnapshot[] = [];
    const observeBlack = (snapshot: RoomSnapshot): void => { blackUpdates.push(snapshot); };
    const observeWhite = (snapshot: RoomSnapshot): void => { whiteUpdates.push(snapshot); };
    black.on('room:state', observeBlack);
    white.on('room:state', observeWhite);

    const player = color === 'black' ? black : white;
    const request: Command = {
      type: 'move', requestId: randomUUID(), gameId: state.gameId, expectedRevision: state.revision, index: forbiddenIndex,
    };
    const denied = await command(player, request);
    expect(denied.ok).toBe(false);
    expect(denied.errorCode).toBe('ILLEGAL_MOVE');

    // A stale command reads the authoritative snapshot without publishing it.
    const inspected = await command(player, { ...request, requestId: randomUUID(), expectedRevision: state.revision + 1 });
    expect(inspected.errorCode).toBe('STALE_STATE');
    expect(inspected.room).toEqual({ ...before, serverNow: inspected.room!.serverNow });
    expect(blackUpdates).toEqual([]);
    expect(whiteUpdates).toEqual([]);

    const continued = Promise.all([
      nextState(black, snapshot => snapshot.game?.revision === state.revision + 1),
      nextState(white, snapshot => snapshot.game?.revision === state.revision + 1),
    ]);
    const accepted = await command(player, { ...request, requestId: randomUUID(), index: 224 });
    expect(accepted.ok).toBe(true);
    expect(await continued).toEqual([accepted.room, accepted.room]);
    expect(accepted.room!.game!.board[forbiddenIndex]).toBeNull();
    expect(accepted.room!.game!.board[224]).toBe(color);
    expect(accepted.room!.game!.turn).toBe(color === 'black' ? 'white' : 'black');
    expect(blackUpdates).toEqual([accepted.room]);
    expect(whiteUpdates).toEqual([accepted.room]);
    black.off('room:state', observeBlack);
    white.off('room:state', observeWhite);
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
