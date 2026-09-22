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
    expect(controller.impact.displayed.value.board[1]).toBe('black');
    vi.advanceTimersByTime(460); expect(FakeWorker.instances).toHaveLength(1);
    controller.undo(); expect(controller.mood('black')).not.toBe('whistle');
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
    expect(controller.store.state.result).toBeNull(); expect(controller.penalty.recipient.value).toBe('black');
  });
  it('pauses time on a hidden tab and resumes without granting extra time', () => {
    controller.start({ ...DEFAULT_SETTINGS, mode: 'local', seconds: 30 }); vi.advanceTimersByTime(10000); hidden(true); vi.advanceTimersByTime(60000);
    expect(controller.store.state.result).toBeNull(); expect(controller.timer.remaining.value).toBe(20000);
    hidden(false); vi.advanceTimersByTime(20000); expect(controller.store.state.result?.reason).toBe('timeout');
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

describe('AI timeout bonk', () => {
  it.each([30, 60] as const)('repeats a cosmetic penalty without changing the board or turn (%ss)', seconds => {
    controller.start({ ...DEFAULT_SETTINGS, seconds });
    const before = JSON.stringify(controller.store.state);
    for (let n = 0; n < 2; n++) {
      vi.advanceTimersByTime(seconds * 1000);
      expect(controller.penalty.recipient.value).toBe('black');
      expect(controller.canMove.value).toBe(false);
      controller.move(19);
      expect(JSON.stringify(controller.store.state)).toBe(before);
      expect(controller.store.history).toHaveLength(0);
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
    expect(controller.penalty.recipient.value).toBe('black'); expect(controller.store.state.lastMove).toBeNull();
  });
  it('pauses the penalty when hidden and resumes the remaining animation time', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 }); vi.advanceTimersByTime(30500);
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
    expect(controller.penalty.recipient.value).toBe('white'); expect(old.terminated).toBe(true);
    old.reply(18); expect(controller.store.state.revision).toBe(1);
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS); old.reply(18);
    expect(controller.store.state.revision).toBe(1);
    FakeWorker.instances[1].reply(18); expect(controller.store.state.revision).toBe(2);
  });
  it('undo cancels the penalty and restores the pre-move clock', () => {
    controller.start({ ...DEFAULT_SETTINGS, seconds: 30 }); vi.advanceTimersByTime(5000); controller.move(19);
    vi.advanceTimersByTime(30500); expect(controller.penalty.recipient.value).toBe('white');
    controller.undo(); expect(controller.penalty.recipient.value).toBeNull(); expect(controller.timer.remaining.value).toBe(25000);
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS); expect(controller.store.state.turn).toBe('black');
    expect(FakeWorker.instances).toHaveLength(1); expect(controller.timer.remaining.value).toBe(22600);
  });
});
