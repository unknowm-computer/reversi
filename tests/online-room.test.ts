// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DEFAULT_SETTINGS, type GameSettings } from '../shared/game/types';
import type { Command, CommandResponse, RoomSnapshot, ServerEvents } from '../shared/protocol';
import { useOnlineRoom } from '../src/composables/useOnlineRoom';

const { createSocket } = vi.hoisted(() => ({ createSocket: vi.fn() }));
vi.mock('socket.io-client', () => ({ io: createSocket }));

interface SocketEvents extends ServerEvents {
  connect: () => void;
  disconnect: () => void;
  connect_error: () => void;
}

class FakeSocket {
  connected = false;
  private handlers: { [Event in keyof SocketEvents]?: SocketEvents[Event][] } = {};
  emitWithAck = vi.fn<(event: 'command', command: Command) => Promise<CommandResponse>>();
  timeout = vi.fn(() => this);
  connect = vi.fn(() => {
    this.connected = true;
    this.handlers.connect?.forEach(handler => handler());
    return this;
  });
  disconnect = vi.fn(() => {
    this.connected = false;
    this.handlers.disconnect?.forEach(handler => handler());
    return this;
  });

  on<Event extends keyof SocketEvents>(event: Event, handler: SocketEvents[Event]): this {
    const listeners = this.handlers[event] ?? [];
    listeners.push(handler);
    this.handlers[event] = listeners;
    return this;
  }

  closeRoom(message = '플레이어가 방을 나갔습니다.'): void {
    this.handlers['room:closed']?.forEach(handler => handler(message));
  }
}

const settings: GameSettings = { ...DEFAULT_SETTINGS, mode: 'online', undoLimit: 0 };
const token = 'e3008283-727d-48a7-a0f6-f57209f602c0';
function snapshot(code = 'ABCDEF'): RoomSnapshot {
  return {
    code, settings, players: [{ color: 'black', connected: true, ready: false, rematch: false }],
    game: null, timeout: null, deadline: null, serverNow: 1000, revision: 0,
  };
}

let wrapper: VueWrapper | undefined;
let socket: FakeSocket;
let online: ReturnType<typeof useOnlineRoom>;
const onState = vi.fn<(room: RoomSnapshot) => void>();
const onClosed = vi.fn<() => void>();

async function createRoom(code = 'ABCDEF'): Promise<void> {
  socket.emitWithAck.mockResolvedValueOnce({ ok: true, room: snapshot(code), token, color: 'black' });
  await online.enter('create', settings);
}

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  socket = new FakeSocket();
  createSocket.mockReturnValue(socket);
  wrapper = mount(defineComponent({
    setup() { online = useOnlineRoom(onState, onClosed); return () => null; },
  }));
  online.connect();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  sessionStorage.clear();
});

describe('online room cancellation and connection reuse', () => {
  it('submits rematch settings only as the editing host with the latest room revision', async () => {
    await createRoom();
    const configuring: RoomSnapshot = { ...snapshot(), revision: 14, rematchSetup: 'editing' };
    online.room.value = configuring;
    socket.emitWithAck.mockResolvedValue({ ok: true, room: { ...configuring, revision: 15, rematchSetup: 'ready' } });
    const edited: GameSettings = { ...settings, seconds: 60, gameType: 'chess', blackCharacter: 'jannabi', undoLimit: 3 };
    online.color.value = 'white';
    online.configureRematch(edited);
    expect(socket.emitWithAck).toHaveBeenCalledTimes(1);
    online.color.value = 'black';
    online.configureRematch(edited);
    expect(socket.emitWithAck).toHaveBeenLastCalledWith('command', expect.objectContaining({
      type: 'configure-rematch', expectedRoomRevision: 14,
      settings: expect.objectContaining({ seconds: 60, gameType: settings.gameType, blackCharacter: settings.blackCharacter, undoLimit: 0, mode: 'online' }),
    }));
    online.configureRematch(edited);
    expect(socket.emitWithAck).toHaveBeenCalledTimes(2);
    await flushPromises();
    online.configureRematch(edited);
    expect(socket.emitWithAck).toHaveBeenCalledTimes(2);
  });

  it('waits for a voluntary leave acknowledgement without treating the preceding room closure as a remote exit', async () => {
    await createRoom();
    expect(sessionStorage.getItem('reversi-session')).not.toBeNull();
    let acknowledge!: (response: CommandResponse) => void;
    socket.emitWithAck.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));

    const leaving = online.leave();
    expect(online.busy.value).toBe(true);
    expect(socket.emitWithAck).toHaveBeenLastCalledWith('command', expect.objectContaining({ type: 'leave' }));
    expect(await online.leave()).toBe(false);
    expect(socket.emitWithAck.mock.calls.filter(([, command]) => command.type === 'leave')).toHaveLength(1);
    // The server broadcasts room:closed before acknowledging the leave command.
    socket.closeRoom();
    await flushPromises();
    expect(online.room.value).toBeNull();
    expect(sessionStorage.getItem('reversi-session')).toBeNull();
    expect(onClosed).not.toHaveBeenCalled();
    expect(online.error.value).toBe('');
    expect(online.busy.value).toBe(true);
    expect(online.connected.value).toBe(true);

    acknowledge({ ok: true });
    expect(await leaving).toBe(true);
    expect(online.busy.value).toBe(false);
    expect(online.connected.value).toBe(true);
    expect(online.error.value).toBe('');
    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(onClosed).not.toHaveBeenCalled();

    // Remounting the selection screen calls connect again, then creates another room.
    online.connect();
    expect(createSocket).toHaveBeenCalledTimes(1);
    await createRoom('GHJKLM');
    expect(online.room.value?.code).toBe('GHJKLM');
    expect(online.busy.value).toBe(false);
    expect(online.connected.value).toBe(true);
    expect(JSON.parse(sessionStorage.getItem('reversi-session')!)).toEqual({ code: 'GHJKLM', token, color: 'black' });
    expect(socket.emitWithAck.mock.calls.filter(([, command]) => command.type === 'create')).toHaveLength(2);
  });

  it('also clears a successful leave when no room closure event arrives', async () => {
    await createRoom();
    socket.emitWithAck.mockResolvedValueOnce({ ok: true });
    expect(await online.leave()).toBe(true);
    expect(online.room.value).toBeNull();
    expect(sessionStorage.getItem('reversi-session')).toBeNull();
    expect(online.busy.value).toBe(false);
    expect(online.connected.value).toBe(true);
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it.each(['failure', 'timeout'] as const)('finishes leaving after a confirmed room closure even if the acknowledgement has a %s', async failure => {
    await createRoom();
    socket.emitWithAck.mockImplementationOnce(async () => {
      socket.closeRoom();
      if (failure === 'timeout') throw new Error('ack timeout');
      return { ok: false, error: '이미 종료된 방입니다.' };
    });
    expect(await online.leave()).toBe(true);
    expect(online.room.value).toBeNull();
    expect(sessionStorage.getItem('reversi-session')).toBeNull();
    expect(online.error.value).toBe('');
    expect(online.busy.value).toBe(false);
    expect(online.connected.value).toBe(true);
    expect(onClosed).not.toHaveBeenCalled();
    await createRoom('GHJKLM');
    expect(online.room.value?.code).toBe('GHJKLM');
  });

  it('returns to selection with an explanation when the other player closes the room', async () => {
    await createRoom();
    socket.closeRoom();
    expect(online.room.value).toBeNull();
    expect(sessionStorage.getItem('reversi-session')).toBeNull();
    expect(online.error.value).toBe('플레이어가 방을 나갔습니다.');
    expect(onClosed).toHaveBeenCalledOnce();
    expect(online.connected.value).toBe(true);
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('cancels pre-game preparation without disconnecting or sending a leave for a nonexistent room', async () => {
    online.error.value = '요청을 처리하지 못했습니다.';
    expect(await online.leave()).toBe(true);
    expect(socket.emitWithAck).not.toHaveBeenCalled();
    expect(online.error.value).toBe('');
    expect(online.connected.value).toBe(true);
    expect(online.busy.value).toBe(false);
    expect(socket.disconnect).not.toHaveBeenCalled();
    await createRoom();
    expect(online.room.value?.code).toBe('ABCDEF');
  });

  it('keeps room and session after a failed leave and allows retrying', async () => {
    await createRoom();
    const savedSession = sessionStorage.getItem('reversi-session');
    socket.emitWithAck.mockResolvedValueOnce({ ok: false, error: '잠시 후 다시 시도해 주세요.', errorCode: 'RATE_LIMIT' });
    expect(await online.leave()).toBe(false);
    expect(online.room.value?.code).toBe('ABCDEF');
    expect(sessionStorage.getItem('reversi-session')).toBe(savedSession);
    expect(online.error.value).toBe('잠시 후 다시 시도해 주세요.');
    expect(online.connected.value).toBe(true);
    expect(online.busy.value).toBe(false);
    expect(onClosed).not.toHaveBeenCalled();

    socket.emitWithAck.mockImplementationOnce(async () => {
      socket.closeRoom();
      return { ok: true };
    });
    expect(await online.leave()).toBe(true);
    expect(online.room.value).toBeNull();
    expect(sessionStorage.getItem('reversi-session')).toBeNull();
    expect(online.error.value).toBe('');
    expect(online.connected.value).toBe(true);
    expect(online.busy.value).toBe(false);
    expect(onClosed).not.toHaveBeenCalled();
  });

  it('still handles remote closure after a failed voluntary leave', async () => {
    await createRoom();
    socket.emitWithAck.mockRejectedValueOnce(new Error('ack timeout'));
    expect(await online.leave()).toBe(false);
    expect(online.busy.value).toBe(false);
    socket.closeRoom('친구가 방을 나갔습니다.');
    expect(onClosed).toHaveBeenCalledOnce();
    expect(online.error.value).toBe('친구가 방을 나갔습니다.');
    expect(online.room.value).toBeNull();
    expect(sessionStorage.getItem('reversi-session')).toBeNull();
  });

  it('disconnects the retained socket when the owning component unmounts', async () => {
    await createRoom();
    socket.emitWithAck.mockResolvedValueOnce({ ok: true });
    await online.leave();
    expect(socket.disconnect).not.toHaveBeenCalled();
    wrapper!.unmount();
    wrapper = undefined;
    expect(socket.disconnect).toHaveBeenCalledOnce();
    expect(online.connected.value).toBe(false);
  });
});
