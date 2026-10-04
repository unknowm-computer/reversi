import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import type { Square } from 'chess.js';
import { createGameServer } from '../server/app';
import { initialState, legalMoves } from '../shared/game/engine';
import { encodePieceMove, JANGGI_PASS, type Promotion } from '../shared/game/pieces';
import { DEFAULT_SETTINGS, type GameType } from '../shared/game/types';
import { squareIndex } from '../shared/games/chess/rules';
import type { ClientEvents, ServerEvents, Command, CommandResponse, RoomSnapshot } from '../shared/protocol';

type Client = Socket<ServerEvents, ClientEvents>;
const chessMove = (from: Square, to: Square, promotion: Promotion = 'queen'): number => encodePieceMove(squareIndex(from), squareIndex(to), promotion);
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

function command(socket: Client, data: Command): Promise<CommandResponse> { return socket.timeout(3000).emitWithAck('command', data); }
function nextState(socket: Client, predicate: (room: RoomSnapshot) => boolean): Promise<RoomSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off('room:state', listener); reject(new Error('state timeout')); }, 3000);
    const listener = (room: RoomSnapshot): void => {
      if (predicate(room)) { clearTimeout(timeout); socket.off('room:state', listener); resolve(room); }
    };
    socket.on('room:state', listener);
  });
}

async function setup(gameType: GameType, seconds: 0 | 30 | 60 = 0) {
  let now = Date.now();
  const app = createGameServer({ tickMs: 10, now: () => now });
  const clients: Client[] = [];
  cleanups.push(async () => { clients.forEach(client => client.disconnect()); await app.close(); });
  await new Promise<void>((resolve, reject) => {
    app.http.once('error', reject);
    app.http.listen(0, '127.0.0.1', () => { app.http.off('error', reject); resolve(); });
  });
  const url = `http://127.0.0.1:${(app.http.address() as AddressInfo).port}`;
  async function connect(): Promise<Client> {
    const client: Client = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve);
      client.once('connect_error', reject);
    });
    return client;
  }
  const black = await connect();
  const white = await connect();
  const created = await command(black, {
    type: 'create', requestId: randomUUID(),
    settings: { ...DEFAULT_SETTINGS, mode: 'online', gameType, seconds, undoLimit: 0, janggiBlackFormation: 'left', janggiWhiteFormation: 'right' },
  });
  expect(created.ok).toBe(true);
  await command(white, { type: 'join', requestId: randomUUID(), code: created.room!.code });
  await command(black, { type: 'ready', requestId: randomUUID() });
  const ready = await command(white, { type: 'ready', requestId: randomUUID() });
  return { black, white, created, room: ready.room!, connect, advance: (ms: number): void => { now += ms; } };
}

async function move(black: Client, white: Client, room: RoomSnapshot, index: number): Promise<RoomSnapshot> {
  const game = room.game!;
  const synced = Promise.all([
    nextState(black, state => state.game?.revision === game.revision + 1),
    nextState(white, state => state.game?.revision === game.revision + 1),
  ]);
  const response = await command(game.turn === 'black' ? black : white, {
    type: 'move', requestId: randomUUID(), gameId: game.gameId, expectedRevision: game.revision, index,
  });
  expect(response.ok, `${index}: ${response.errorCode}`).toBe(true);
  expect(await synced).toEqual([response.room, response.room]);
  return response.room!;
}

describe('Authoritative online piece games', () => {
  it.each(['chess', 'janggi'] as const)('synchronizes %s pieces, rejects stolen/invalid moves, and preserves state on reconnect', async gameType => {
    const { black, white, created, room, connect } = await setup(gameType);
    const first = legalMoves(room.game!).find(code => code !== JANGGI_PASS)!;
    const base = { type: 'move' as const, gameId: room.game!.gameId, expectedRevision: 0 };
    expect((await command(white, { ...base, requestId: randomUUID(), index: first })).errorCode).toBe('NOT_YOUR_TURN');
    const enemyMove = gameType === 'chess' ? chessMove('e7', 'e5') : encodePieceMove(27, 36);
    expect((await command(black, { ...base, requestId: randomUUID(), index: enemyMove })).errorCode).toBe('ILLEGAL_MOVE');
    const invalid = gameType === 'chess' ? encodePieceMove(89, 80) : encodePieceMove(54, 45, 'rook');
    expect((await command(black, { ...base, requestId: randomUUID(), index: invalid })).errorCode).toBe('INVALID_COMMAND');
    expect((await command(black, { ...base, requestId: randomUUID(), index: 19 })).errorCode).toBe('INVALID_COMMAND');

    const moved = await move(black, white, room, first);
    const disconnected = nextState(white, state => !state.players[0].connected);
    black.disconnect();
    await disconnected;
    const replacement = await connect();
    const restored = await command(replacement, { type: 'resume', requestId: randomUUID(), code: room.code, token: created.token! });
    expect(restored.ok).toBe(true);
    expect(restored.room!.game).toEqual(moved.game);
    expect(restored.room!.settings).toEqual(room.settings);
    expect(restored.room!.game!.pieces).toHaveLength(gameType === 'chess' ? 64 : 90);
    if (gameType === 'chess') expect(restored.room!.game!.chess!.positionHistory).toHaveLength(2);
    else {
      expect(restored.room!.settings.janggiBlackFormation).toBe('left');
      expect(restored.room!.settings.janggiWhiteFormation).toBe('right');
      expect(restored.room!.game!.janggi!.positionHistory).toHaveLength(2);
    }
  });

  it.each(['reversi', 'gomoku'] as const)('does not allow a new encoded piece move in %s', async gameType => {
    const { black, room } = await setup(gameType);
    const response = await command(black, { type: 'move', requestId: randomUUID(), gameId: room.game!.gameId, expectedRevision: 0, index: chessMove('e2', 'e4') });
    expect(response.errorCode).toBe('INVALID_COMMAND');
  });

  it('rejects a chess move that leaves the king in check without changing the timer or board', async () => {
    const { black, white, room } = await setup('chess', 60);
    let current = room;
    for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['e2', 'e3'], ['d8', 'h4']] as const) current = await move(black, white, current, chessMove(from, to));
    expect(current.game!.check).toBe('black');
    const game = current.game!;
    const rejected = await command(black, { type: 'move', requestId: randomUUID(), gameId: game.gameId, expectedRevision: game.revision, index: chessMove('a2', 'a3') });
    expect(rejected.errorCode).toBe('ILLEGAL_MOVE');
    const inspected = await command(black, { type: 'move', requestId: randomUUID(), gameId: game.gameId, expectedRevision: game.revision + 1, index: chessMove('a2', 'a3') });
    expect(inspected.errorCode).toBe('STALE_STATE');
    expect(inspected.room).toEqual(current);
    const escaped = await move(black, white, current, chessMove('g2', 'g3'));
    expect(escaped.game!.check).toBeNull();
  });

  it('synchronizes an underpromotion reached through real online moves', async () => {
    const { black, white, room } = await setup('chess');
    let current = room;
    for (const [from, to] of [['a2', 'a4'], ['b7', 'b5'], ['a4', 'b5'], ['b8', 'c6'], ['b5', 'b6'], ['a7', 'a6'], ['b6', 'b7'], ['a6', 'a5']] as const) current = await move(black, white, current, chessMove(from, to));
    current = await move(black, white, current, chessMove('b7', 'b8', 'knight'));
    expect(current.game!.pieces![squareIndex('b8')]).toEqual({ color: 'black', kind: 'knight' });
    expect(current.game!.board[squareIndex('b7')]).toBeNull();
    expect(current.game!.chess!.fen).toMatch(/^rNbqkbnr\//);
  });

  it('ends chess on checkmate, stops its clock, and resets both clients on rematch', async () => {
    const { black, white, room } = await setup('chess', 60);
    let current = room;
    for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']] as const) current = await move(black, white, current, chessMove(from, to));
    expect(current.game!.result).toEqual({ winner: 'white', reason: 'checkmate' });
    expect(current.deadline).toBeNull();
    const game = current.game!;
    expect((await command(black, { type: 'move', requestId: randomUUID(), gameId: game.gameId, expectedRevision: game.revision, index: chessMove('a2', 'a3') })).errorCode).toBe('ILLEGAL_MOVE');
    const base = { type: 'rematch' as const, gameId: game.gameId, expectedRevision: game.revision };
    await command(black, { ...base, requestId: randomUUID() });
    const synced = nextState(black, state => state.rematchSetup === 'editing');
    const editing = await command(white, { ...base, requestId: randomUUID() });
    expect(await synced).toEqual(editing.room);
    expect(editing.room!.game).toBeNull();
    expect(editing.room!.deadline).toBeNull();
    await command(black, {
      type: 'configure-rematch', requestId: randomUUID(), expectedRoomRevision: editing.room!.revision,
      settings: { ...editing.room!.settings, mode: 'online', undoLimit: 0 },
    });
    const restarted = nextState(black, state => state.game !== null && state.game.gameId !== game.gameId);
    const rematched = await command(white, { type: 'ready', requestId: randomUUID() });
    expect(await restarted).toEqual(rematched.room);
    expect(rematched.room!.game!.chess).toEqual(room.game!.chess);
    expect(rematched.room!.game!.pieces).toEqual(room.game!.pieces);
    expect(rematched.room!.game!.result).toBeNull();
    expect(rematched.room!.settings).toEqual(room.settings);
    expect(rematched.room!.deadline).not.toBeNull();
  });

  it('restores a pending Janggi pass and starts a rematch with newly confirmed formations', async () => {
    const { black, white, room, created, connect } = await setup('janggi');
    let current = await move(black, white, room, JANGGI_PASS);
    expect(current.game!.janggi!.consecutivePasses).toBe(1);
    const disconnected = nextState(white, state => !state.players[0].connected);
    black.disconnect();
    await disconnected;
    const replacement = await connect();
    const restored = await command(replacement, { type: 'resume', requestId: randomUUID(), code: room.code, token: created.token! });
    expect(restored.room!.game).toEqual(current.game);
    current = await move(replacement, white, restored.room!, JANGGI_PASS);
    expect(current.game!.result).toEqual({ winner: null, reason: 'mutualPass' });
    const game = current.game!;
    const base = { type: 'rematch' as const, gameId: game.gameId, expectedRevision: game.revision };
    await command(replacement, { ...base, requestId: randomUUID() });
    const editing = await command(white, { ...base, requestId: randomUUID() });
    const settings = { ...editing.room!.settings, mode: 'online' as const, undoLimit: 0 as const, janggiBlackFormation: 'outer' as const, janggiWhiteFormation: 'inner' as const };
    await command(replacement, {
      type: 'configure-rematch', requestId: randomUUID(), expectedRoomRevision: editing.room!.revision, settings,
    });
    const rematched = await command(white, { type: 'ready', requestId: randomUUID() });
    const expected = initialState(rematched.room!.game!.gameId, 'janggi', settings);
    expect(rematched.room!.settings).toEqual(settings);
    expect(rematched.room!.game!.pieces).toEqual(expected.pieces);
    expect(rematched.room!.game!.pieces).not.toEqual(room.game!.pieces);
    expect(rematched.room!.game!.janggi).toEqual(expected.janggi);
    expect(rematched.room!.game!.passed).toBeNull();
  });

  it.each(['chess', 'janggi'] as const)('pauses %s at timeout without changing pieces or special-move metadata', async gameType => {
    const { black, white, room, advance } = await setup(gameType, 30);
    const waiting = nextState(white, state => state.timeout?.phase === 'decision');
    advance(30001);
    const pending = await waiting;
    expect(pending.deadline).toBeNull();
    expect(pending.game!.pieces).toEqual(room.game!.pieces);
    expect(pending.game!.chess).toEqual(room.game!.chess);
    expect(pending.game!.janggi).toEqual(room.game!.janggi);
    const game = pending.game!;
    const rejected = await command(black, { type: 'move', requestId: randomUUID(), gameId: game.gameId, expectedRevision: game.revision, index: legalMoves(game)[0] });
    expect(rejected.errorCode).toBe('TIMEOUT_PENDING');
    const ended = await command(white, { type: 'timeout-choice', choice: 'end', requestId: randomUUID(), gameId: game.gameId, expectedRevision: game.revision });
    expect(ended.room!.game!.result).toEqual({ winner: 'white', reason: 'timeout' });
    expect(ended.room!.game!.pieces).toEqual(room.game!.pieces);
  });
});
