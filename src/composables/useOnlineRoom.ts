import { createId } from '../utils/id';
import { ref, onUnmounted } from 'vue';
import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, Command, CommandResponse, RoomSnapshot } from '../../shared/protocol';
import type { Character, Color, GameSettings, GameState } from '../../shared/game/types';
interface Session { code: string; token: string; color: Color }
export function useOnlineRoom(onState: (room: RoomSnapshot) => void, onClosed: () => void) {
  const room = ref<RoomSnapshot | null>(null);
  const color = ref<Color>('black');
  const connected = ref(false), busy = ref(false), error = ref('');
  let socket: Socket<ServerEvents, ClientEvents> | null = null;
  let session: Session | null = null;
  try { const saved = sessionStorage.getItem('reversi-session'); if (saved) session = JSON.parse(saved) as Session; } catch { /* Storage can be unavailable in private browsing. */ }
  function save(): void { try { if (session) sessionStorage.setItem('reversi-session', JSON.stringify(session)); else sessionStorage.removeItem('reversi-session'); } catch { /* A live session still works without persistence. */ } }
  function receive(next: RoomSnapshot): void {
    if (room.value?.code === next.code && room.value.revision > next.revision) return;
    room.value = next; onState(next);
  }
  async function send(command: Command): Promise<CommandResponse> {
    if (!socket?.connected) { error.value = '서버 연결을 기다려 주세요.'; return { ok: false }; }
    busy.value = true; error.value = '';
    try {
      const response = await socket.timeout(5000).emitWithAck('command', command);
      if (response.room) receive(response.room);
      if (!response.ok) error.value = response.error ?? '요청을 처리하지 못했습니다.';
      return response;
    } catch { error.value = '서버 응답이 늦어지고 있습니다. 연결을 확인해 주세요.'; return { ok: false }; }
    finally { busy.value = false; }
  }
  function connect(): void {
    if (socket) return;
    socket = io(import.meta.env.VITE_SERVER_URL || undefined, { autoConnect: false, transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      connected.value = true; error.value = '';
      if (session) {
        color.value = session.color;
        void send({ type: 'resume', requestId: createId(), code: session.code, token: session.token }).then(response => {
          if (!response.ok && response.errorCode && response.errorCode !== 'RATE_LIMIT') { session = null; save(); room.value = null; onClosed(); }
        });
      }
    });
    socket.on('disconnect', () => { connected.value = false; });
    socket.on('connect_error', () => { error.value = '서버에 연결할 수 없습니다. 잠시 후 자동으로 다시 시도합니다.'; });
    socket.on('room:state', receive);
    socket.on('room:closed', message => { session = null; save(); room.value = null; error.value = message; onClosed(); });
    socket.connect();
  }
  async function enter(type: 'create' | 'join', config: GameSettings, code = ''): Promise<void> {
    if (busy.value) return;
    const response = await send(type === 'create'
      ? { type, requestId: createId(), settings: { ...config, mode: 'online', undoLimit: 0 } }
      : { type, requestId: createId(), code: code.trim().toUpperCase() });
    if (response.ok && response.room && response.token && response.color) {
      color.value = response.color; session = { code: response.room.code, token: response.token, color: response.color }; save(); receive(response.room);
    }
  }
  function ready(): void { if (!busy.value) void send({ type: 'ready', requestId: createId() }); }
  function chooseCharacter(character: Character): void { if (!busy.value) void send({ type: 'character', requestId: createId(), character }); }
  function gameCommand(type: 'move' | 'resign' | 'rematch', game: GameState, index = 0): void {
    if (busy.value) return;
    const base = { requestId: createId(), gameId: game.gameId, expectedRevision: game.revision };
    void send(type === 'move' ? { type, ...base, index } : { type, ...base });
  }
  async function leave(): Promise<boolean> {
    if (room.value && connected.value) {
      const response = await send({ type: 'leave', requestId: createId() });
      if (!response.ok) return false;
    }
    session = null; save(); room.value = null; socket?.disconnect(); socket = null; connected.value = false; return true;
  }
  onUnmounted(() => socket?.disconnect());
  return { room, color, connected, busy, error, hasSession: Boolean(session), connect, enter, ready, chooseCharacter, gameCommand, leave };
}
