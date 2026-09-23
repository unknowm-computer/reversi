// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { useGameController } from '../src/composables/useGameController';
import { TIMEOUT_PENALTY_MS } from '../src/composables/useTimeoutPenalty';
import { DEFAULT_SETTINGS, type GameState } from '../shared/game/types';
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<{ gameId: string; revision: number; index: number }>) => void) | null = null;
  onerror: (() => void) | null = null;
  request: GameState | null = null;
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(state: GameState): void { this.request = state; }
  terminate(): void { this.terminated = true; }
  reply(index: number): void { this.onmessage?.({ data: { gameId: this.request!.gameId, revision: this.request!.revision, index } } as MessageEvent<{ gameId: string; revision: number; index: number }>); }
}
let wrapper: VueWrapper | undefined;
let controller: ReturnType<typeof useGameController>;
function hidden(value: boolean): void { Object.defineProperty(document, 'hidden', { configurable: true, value }); document.dispatchEvent(new Event('visibilitychange')); }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-22T12:00:00Z')); vi.stubGlobal('Worker', FakeWorker);
  FakeWorker.instances = []; localStorage.setItem('reversi-sound', 'off'); sessionStorage.clear(); hidden(false);
  wrapper = mount(defineComponent({ setup() { controller = useGameController(); return () => null; } }), { global: { plugins: [createPinia()] } });
});
afterEach(() => { wrapper?.unmount(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('Controller lifecycle', () => {
  it('celebrates corners on the player card without delaying the flip', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 });
    controller.store.state.board[1] = 'white'; controller.store.state.board[2] = 'black';
    controller.move(0);
    expect(controller.impact.scene.value).toBeNull(); expect(controller.mood('black')).toBe('whistle');
    expect(controller.mood('white')).toBe('sad');
    expect(controller.impact.displayed.value.board[1]).toBe('black');
    vi.advanceTimersByTime(460); expect(FakeWorker.instances).toHaveLength(1);
    expect(controller.mood('white')).toBe('sad');
    controller.undo(); expect(controller.mood('black')).not.toBe('whistle');
    expect(controller.mood('white')).not.toBe('sad');
  });

  it.each(['jannabi', 'grasshopper'] as const)('pairs %s corner celebration with a sad opponent until it expires', (blackCharacter) => {
    controller.start({ ...DEFAULT_SETTINGS, blackCharacter, mode: 'local', seconds: 0 });
    controller.store.state.turn = 'white';
    controller.store.state.board[1] = 'black'; controller.store.state.board[2] = 'white';
    controller.move(0);
    expect(controller.mood('white')).toBe(blackCharacter === 'jannabi' ? 'whistle' : 'sly');
    expect(controller.mood('black')).toBe('sad');
    vi.advanceTimersByTime(2700);
    expect(controller.mood('black')).toBe('idle'); expect(controller.mood('white')).toBe('idle');
  });

  it('holds AI and the next turn clock until the large capture impact and flips finish', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 });
    for (let i = 9; i <= 13; i++) controller.store.state.board[i] = 'white'; controller.store.state.board[14] = 'black';
    vi.advanceTimersByTime(1000); controller.move(8);
    expect(controller.impact.scene.value?.kind).toBe('capture'); expect(controller.canMove.value).toBe(false);
    vi.advanceTimersByTime(700); expect(controller.impact.scene.value).toBeNull(); expect(FakeWorker.instances).toHaveLength(0);
    expect(controller.timer.remaining.value).toBe(29000);
    vi.advanceTimersByTime(530); expect(FakeWorker.instances).toHaveLength(1); expect(controller.timer.remaining.value).toBe(30000);
  });

  it('ignores rapid double input during flip animation', () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local' }); controller.move(19); controller.move(18);
    expect(controller.store.state.revision).toBe(1); expect(controller.animating.value).toBe(true);
    vi.advanceTimersByTime(500); expect(controller.canMove.value).toBe(true);
  });
  it('terminates AI work and ignores its stale answer after undo', () => {
    controller.start(DEFAULT_SETTINGS); controller.move(19); vi.advanceTimersByTime(500);
    const worker = FakeWorker.instances[0]; expect(controller.thinking.value).toBe(true);
    controller.undo(); expect(worker.terminated).toBe(true); worker.reply(18);
    expect(controller.store.counts.empty).toBe(60); expect(controller.store.state.turn).toBe('black');
  });
  it('ignores an old AI answer after restarting the game', () => {
    controller.start(DEFAULT_SETTINGS); controller.move(19); vi.advanceTimersByTime(500); const worker = FakeWorker.instances[0];
    controller.start(DEFAULT_SETTINGS); worker.reply(18); expect(controller.store.state.revision).toBe(0);
  });
  it('restores exactly the pre-move remaining time on undo', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 }); vi.advanceTimersByTime(6500); controller.move(19); controller.undo();
    expect(controller.timer.remaining.value).toBe(23500); vi.advanceTimersByTime(23500);
    expect(controller.store.state.result).toBeNull(); expect(controller.timeoutLoser.value).toBe('black');
  });
  it('pauses time on a hidden tab and resumes without granting extra time', () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local', seconds: 30 }); vi.advanceTimersByTime(10000); hidden(true); vi.advanceTimersByTime(60000);
    expect(controller.store.state.result).toBeNull(); expect(controller.timer.remaining.value).toBe(20000);
    hidden(false); vi.advanceTimersByTime(20000); expect(controller.timeoutLoser.value).toBe('black'); expect(controller.store.state.result).toBeNull();
  });
  it('handles hiding during animation and AI computation', () => {
    controller.start(DEFAULT_SETTINGS); controller.move(19); hidden(true); vi.advanceTimersByTime(2000);
    expect(FakeWorker.instances).toHaveLength(0); hidden(false); expect(FakeWorker.instances).toHaveLength(1);
    hidden(true); expect(FakeWorker.instances[0].terminated).toBe(true);
    hidden(false); expect(FakeWorker.instances).toHaveLength(2); FakeWorker.instances[1].reply(18);
    expect(controller.store.state.revision).toBe(2);
  });
  it('does not time out when the timer is disabled and cleans up on leaving', async () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 0 }); expect(controller.store.settings.seconds).toBe(0); vi.advanceTimersByTime(3600000); expect(controller.store.state.result).toBeNull();
    controller.move(19); await controller.home(); vi.advanceTimersByTime(5000);
    expect(controller.screen.value).toBe('setup'); expect(FakeWorker.instances).toHaveLength(0);
  });
});

describe('AI timeout choice', () => {
  it.each([30, 60] as const)('waits for forgiveness before each penalty without changing the board or turn (%ss)', seconds => {
    controller.start({ ...DEFAULT_SETTINGS, seconds });
    const before = JSON.stringify(controller.store.state);
    for (let n = 0; n < 2; n++) {
      vi.advanceTimersByTime(seconds * 1000);
      expect(controller.timeoutLoser.value).toBe('black');
      expect(controller.canDecideTimeout.value).toBe(true);
      expect(controller.penalty.recipient.value).toBeNull();
      expect(controller.canMove.value).toBe(false);
      controller.move(19);
      expect(JSON.stringify(controller.store.state)).toBe(before);
      expect(controller.store.history).toHaveLength(0);
      vi.advanceTimersByTime(5000);
      expect(controller.timer.remaining.value).toBe(0);
      controller.chooseTimeout('forgive');
      expect(controller.penalty.recipient.value).toBe('black');
      vi.advanceTimersByTime(TIMEOUT_PENALTY_MS);
      expect(controller.penalty.recipient.value).toBeNull();
      expect(controller.timer.remaining.value).toBe(seconds * 1000);
      expect(controller.canMove.value).toBe(true);
    }
    controller.move(19); expect(controller.store.state.lastMove).toBe(19);
  });
  it('does not accept a click at the exact deadline before the interval notices', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 });
    vi.setSystemTime(Date.now() + 30001); controller.move(19);
    expect(controller.timeoutLoser.value).toBe('black'); expect(controller.store.state.lastMove).toBeNull();
  });
  it('pauses the penalty when hidden and resumes the remaining animation time', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 }); vi.advanceTimersByTime(30000);
    controller.chooseTimeout('forgive'); vi.advanceTimersByTime(500);
    hidden(true); vi.advanceTimersByTime(60000);
    expect(controller.penalty.recipient.value).toBe('black');
    hidden(false); vi.advanceTimersByTime(TIMEOUT_PENALTY_MS - 500);
    expect(controller.penalty.recipient.value).toBeNull(); expect(controller.timer.remaining.value).toBe(30000);
  });
  it('cancels the penalty when restarting or leaving', async () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 }); vi.advanceTimersByTime(30000);
    controller.start(DEFAULT_SETTINGS); vi.advanceTimersByTime(TIMEOUT_PENALTY_MS);
    expect(controller.penalty.recipient.value).toBeNull(); expect(controller.timer.remaining.value).toBe(30000 - TIMEOUT_PENALTY_MS);
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 }); vi.advanceTimersByTime(30000);
    await controller.home(); vi.advanceTimersByTime(TIMEOUT_PENALTY_MS);
    expect(controller.penalty.recipient.value).toBeNull(); expect(controller.screen.value).toBe('setup');
  });
  it('cancels an AI timeout and rejects the old worker even though the position is unchanged', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 }); controller.move(19); vi.advanceTimersByTime(500);
    const old = FakeWorker.instances[0]; vi.advanceTimersByTime(30000);
    expect(controller.timeoutLoser.value).toBe('white'); expect(old.terminated).toBe(true);
    old.reply(18); expect(controller.store.state.revision).toBe(1);
    controller.chooseTimeout('forgive');
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS); old.reply(18);
    expect(controller.store.state.revision).toBe(1);
    FakeWorker.instances[1].reply(18); expect(controller.store.state.revision).toBe(2);
  });
  it('undo cancels the penalty and restores the pre-move clock', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 }); vi.advanceTimersByTime(5000); controller.move(19);
    vi.advanceTimersByTime(30500); expect(controller.timeoutLoser.value).toBe('white');
    controller.chooseTimeout('forgive'); expect(controller.penalty.recipient.value).toBe('white');
    controller.undo(); expect(controller.penalty.recipient.value).toBeNull(); expect(controller.timer.remaining.value).toBe(25000);
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS); expect(controller.store.state.turn).toBe('black');
    expect(FakeWorker.instances).toHaveLength(1); expect(controller.timer.remaining.value).toBe(22600);
  });
});


describe('Local timeout choice', () => {
  it('waits without changing the board or accepting moves, then forgives with a fresh clock', () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local' });
    const before = [...controller.store.state.board];
    vi.advanceTimersByTime(30000);
    expect(controller.timeoutLoser.value).toBe('black'); expect(controller.timeoutDecider.value).toBe('white');
    expect(controller.canDecideTimeout.value).toBe(true); expect(controller.canMove.value).toBe(false);
    controller.move(19); vi.advanceTimersByTime(60000);
    expect(controller.store.state.board).toEqual(before); expect(controller.timer.remaining.value).toBe(0);
    controller.chooseTimeout('forgive'); controller.chooseTimeout('end');
    expect(controller.penalty.recipient.value).toBe('black'); expect(controller.store.state.result).toBeNull();
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS - 1); expect(controller.canMove.value).toBe(false);
    vi.advanceTimersByTime(1); expect(controller.canMove.value).toBe(true); expect(controller.timer.remaining.value).toBe(30000);
    expect(controller.store.state.turn).toBe('black'); expect(controller.store.state.board).toEqual(before);
    vi.advanceTimersByTime(30000); controller.chooseTimeout('end');
    expect(controller.store.state.result).toEqual({ winner: 'white', reason: 'timeout' });
  });
  it('handles a deadline click, blocks undo, and preserves the choice through hiding', () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local', seconds: 30 }); controller.move(19); vi.advanceTimersByTime(500);
    vi.setSystemTime(Date.now() + 30000); controller.move(18);
    expect(controller.store.state.revision).toBe(1); expect(controller.timeoutLoser.value).toBe('white');
    controller.undo(); expect(controller.store.state.revision).toBe(1);
    hidden(true); vi.advanceTimersByTime(60000); hidden(false);
    expect(controller.timeoutLoser.value).toBe('white'); expect(controller.canMove.value).toBe(false);
    controller.chooseTimeout('forgive'); hidden(true); vi.advanceTimersByTime(10000);
    expect(controller.penalty.recipient.value).toBe('white'); hidden(false); vi.advanceTimersByTime(TIMEOUT_PENALTY_MS);
    expect(controller.store.state.turn).toBe('white'); expect(controller.timer.remaining.value).toBe(30000);
  });
  it('clears a pending choice when starting again or leaving', async () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local' }); vi.advanceTimersByTime(30000);
    await controller.home(); expect(controller.timeoutLoser.value).toBeNull();
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local' }); vi.advanceTimersByTime(30000);
    controller.start(DEFAULT_SETTINGS); expect(controller.timeoutLoser.value).toBeNull(); expect(controller.timer.remaining.value).toBe(30000);
  });
});

describe('Countdown warning sounds', () => {
  it.each([30, 60] as const)('ticks once per second from ten to one with a %s-second timer', seconds => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local', seconds });
    const sound = vi.spyOn(controller.audio, 'sfx');
    const ticks = (): number[] => sound.mock.calls.filter(([kind]) => kind === 'countdown').map(([, remaining]) => remaining!);
    vi.advanceTimersByTime((seconds - 10) * 1000 - 1);
    expect(ticks()).toEqual([]);
    vi.advanceTimersByTime(151);
    expect(ticks()).toEqual([10]);
    vi.advanceTimersByTime(9000);
    expect(ticks()).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    vi.advanceTimersByTime(2000);
    expect(ticks()).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(controller.timeoutPending.value).toBe(true);
  });

  it('pauses countdown sounds on a hidden tab without replaying the current second', () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local', seconds: 30 });
    const sound = vi.spyOn(controller.audio, 'sfx');
    vi.advanceTimersByTime(20200);
    sound.mockClear();
    hidden(true); vi.advanceTimersByTime(5000);
    expect(sound).not.toHaveBeenCalled();
    hidden(false); vi.advanceTimersByTime(200);
    expect(sound).not.toHaveBeenCalled();
    vi.advanceTimersByTime(900);
    expect(sound.mock.calls).toEqual([['countdown', 9]]);
  });

  it('resumes ticking after undo and resets the countdown when the next turn starts', () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local', seconds: 30 });
    vi.advanceTimersByTime(20500); controller.move(19);
    vi.advanceTimersByTime(500);
    const sound = vi.spyOn(controller.audio, 'sfx');
    vi.advanceTimersByTime(1000);
    expect(sound).not.toHaveBeenCalled();
    controller.undo('black');
    expect(controller.timer.remaining.value).toBe(9500);
    sound.mockClear(); vi.advanceTimersByTime(1000);
    expect(sound.mock.calls).toEqual([['countdown', 9]]);
    controller.finish('black', 'resign'); sound.mockClear();
    vi.advanceTimersByTime(2000);
    expect(sound).not.toHaveBeenCalled();
  });

  it('does not tick without a time limit or after leaving the game', async () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local', seconds: 0 });
    const sound = vi.spyOn(controller.audio, 'sfx');
    vi.advanceTimersByTime(60000); expect(sound).not.toHaveBeenCalled();
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local', seconds: 30 });
    vi.advanceTimersByTime(20200); await controller.home(); sound.mockClear();
    vi.advanceTimersByTime(10000); expect(sound).not.toHaveBeenCalled();
  });
});


describe('Timeout beep and choice', () => {
  it.each(['ai', 'local'] as const)('beeps once at zero in %s and once again after a new timeout', mode => {
    controller.start({ ...DEFAULT_SETTINGS, mode, seconds: 30 });
    const sound = vi.spyOn(controller.audio, 'sfx');
    const beeps = (): number => sound.mock.calls.filter(([kind]) => kind === 'timeout').length;
    vi.advanceTimersByTime(29999); expect(beeps()).toBe(0);
    vi.advanceTimersByTime(1); expect(beeps()).toBe(1);
    expect(controller.timeoutPending.value).toBe(true);
    expect(controller.canDecideTimeout.value).toBe(true);
    expect(controller.penalty.recipient.value).toBeNull();
    vi.advanceTimersByTime(60000); controller.move(19); controller.undo();
    expect(beeps()).toBe(1);
    expect(controller.store.state.lastMove).toBeNull();
    controller.chooseTimeout('forgive');
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS + 30000);
    expect(beeps()).toBe(2);
  });

  it.each(['black', 'white'] as const)('allows ending a solo game after %s times out', loser => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 });
    if (loser === 'white') { controller.move(19); vi.advanceTimersByTime(500); }
    vi.advanceTimersByTime(30000);
    expect(controller.timeoutLoser.value).toBe(loser);
    controller.chooseTimeout('end');
    expect(controller.store.state.result).toEqual({ winner: loser === 'black' ? 'white' : 'black', reason: 'timeout' });
    expect(controller.timeoutLoser.value).toBeNull();
    expect(controller.penalty.recipient.value).toBeNull();
  });

  it('does not replay the beep for repeated online decision snapshots', () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'online', seconds: 30 });
    const sound = vi.spyOn(controller.audio, 'sfx');
    const room = {
      code: 'ABCDEF', settings: controller.store.settings, players: [],
      game: controller.store.state, deadline: null, serverNow: Date.now(), revision: 2,
      timeout: { phase: 'decision' as const, loser: 'black' as const },
    };
    controller.online.room.value = room;
    expect(sound.mock.calls).toEqual([['timeout']]);
    controller.online.room.value = { ...room, revision: 3 };
    controller.online.room.value = { ...room, revision: 4 };
    expect(sound.mock.calls).toEqual([['timeout']]);
    expect(controller.canDecideTimeout.value).toBe(false);
    controller.online.color.value = 'white';
    expect(controller.canDecideTimeout.value).toBe(true);
    controller.online.room.value = { ...room, timeout: null };
    controller.online.room.value = { ...room, revision: 5 };
    expect(sound.mock.calls).toEqual([['timeout'], ['timeout']]);
  });
});
