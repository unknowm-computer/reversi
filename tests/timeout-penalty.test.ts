// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { useTimeoutPenalty } from '../src/composables/useTimeoutPenalty';
import { TIMEOUT_PENALTY_HIT_MS, TIMEOUT_PENALTY_MS } from '../shared/game/types';

let wrapper: VueWrapper;
let penalty: ReturnType<typeof useTimeoutPenalty>;
const complete = vi.fn(), hit = vi.fn();

beforeEach(() => {
  vi.useFakeTimers(); complete.mockClear(); hit.mockClear();
  wrapper = mount(defineComponent({ setup() {
    penalty = useTimeoutPenalty(complete, hit);
    return () => null;
  } }));
});
afterEach(() => { wrapper.unmount(); vi.useRealTimers(); });

describe('Timeout penalty impact timing', () => {
  it('hits once at contact and completes after the full animation', () => {
    penalty.begin('black');
    expect(penalty.elapsed.value).toBe(0);
    vi.advanceTimersByTime(TIMEOUT_PENALTY_HIT_MS - 1);
    expect(hit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hit).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS - TIMEOUT_PENALTY_HIT_MS);
    expect(penalty.recipient.value).toBeNull();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(hit).toHaveBeenCalledTimes(1);
  });

  it('pauses both timers without drifting when visibility events repeat', () => {
    penalty.begin('white'); vi.advanceTimersByTime(500); penalty.pause();
    vi.advanceTimersByTime(10000); penalty.pause();
    expect(hit).not.toHaveBeenCalled(); expect(complete).not.toHaveBeenCalled();
    expect(penalty.elapsed.value).toBe(0);
    penalty.resume(); vi.advanceTimersByTime(100); penalty.resume();
    vi.advanceTimersByTime(TIMEOUT_PENALTY_HIT_MS - 601);
    expect(hit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(hit).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS - TIMEOUT_PENALTY_HIT_MS);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does not replay contact after pausing an already landed hit', () => {
    penalty.begin('black'); vi.advanceTimersByTime(TIMEOUT_PENALTY_HIT_MS);
    penalty.pause(); vi.advanceTimersByTime(5000); penalty.resume();
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS - TIMEOUT_PENALTY_HIT_MS);
    expect(hit).toHaveBeenCalledTimes(1); expect(complete).toHaveBeenCalledTimes(1);
  });

  it('cancels an old hit when a new penalty begins and cancels all pending work', () => {
    penalty.begin('black'); vi.advanceTimersByTime(500); penalty.begin('white');
    vi.advanceTimersByTime(TIMEOUT_PENALTY_HIT_MS - 1);
    expect(hit).not.toHaveBeenCalled();
    penalty.cancel(); vi.advanceTimersByTime(TIMEOUT_PENALTY_MS);
    expect(hit).not.toHaveBeenCalled(); expect(complete).not.toHaveBeenCalled();
    expect(penalty.recipient.value).toBeNull();
  });

  it('removes pending impact and completion callbacks on unmount', () => {
    penalty.begin('white'); wrapper.unmount();
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS);
    expect(hit).not.toHaveBeenCalled(); expect(complete).not.toHaveBeenCalled();
  });

  it('joins an online animation at its server offset and hits only at the remaining contact time', () => {
    const elapsed = 500;
    penalty.begin('black', TIMEOUT_PENALTY_MS - elapsed);
    expect(penalty.elapsed.value).toBe(elapsed);
    vi.advanceTimersByTime(100); penalty.pause(); vi.advanceTimersByTime(10000);
    expect(penalty.elapsed.value).toBe(elapsed);
    penalty.resume(); vi.advanceTimersByTime(TIMEOUT_PENALTY_HIT_MS - elapsed - 101);
    expect(hit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(hit).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS - TIMEOUT_PENALTY_HIT_MS);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it.each([TIMEOUT_PENALTY_HIT_MS, 1200, TIMEOUT_PENALTY_MS])('does not replay a hit when joining %sms into the online animation', elapsed => {
    penalty.begin('white', TIMEOUT_PENALTY_MS - elapsed);
    expect(penalty.elapsed.value).toBe(elapsed);
    vi.advanceTimersByTime(TIMEOUT_PENALTY_MS - elapsed);
    expect(hit).not.toHaveBeenCalled(); expect(complete).toHaveBeenCalledTimes(1);
    expect(penalty.recipient.value).toBeNull();
  });
});
