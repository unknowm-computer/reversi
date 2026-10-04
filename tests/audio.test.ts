// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { useGameAudio } from '../src/composables/useGameAudio';

class AudioParamStub {
  value = 0;
  setValueAtTime(value: number): void { this.value = value; }
  linearRampToValueAtTime(value: number): void { this.value = value; }
  exponentialRampToValueAtTime(value: number): void { this.value = value; }
  setTargetAtTime(value: number): void { this.value = value; }
  cancelScheduledValues(): void {}
}
class AudioNodeStub {
  disconnect = vi.fn();
  connect<T extends AudioNodeStub>(target: T): T { return target; }
}
class GainStub extends AudioNodeStub { gain = new AudioParamStub(); }
class OscillatorStub extends AudioNodeStub {
  type = 'sine'; frequency = new AudioParamStub(); onended: (() => void) | null = null;
  private ending: ReturnType<typeof setTimeout> | undefined;
  start = vi.fn();
  stop = vi.fn((when = 10): void => {
    clearTimeout(this.ending);
    this.ending = setTimeout(() => this.onended?.(), Math.max(0, when - 10) * 1000);
  });
}
class AudioContextStub {
  static latest: AudioContextStub;
  currentTime = 10; state = 'running'; destination = new AudioNodeStub();
  nodes: AudioNodeStub[] = []; oscillators: OscillatorStub[] = [];
  constructor() { AudioContextStub.latest = this; }
  createGain(): GainStub { const node = new GainStub(); this.nodes.push(node); return node; }
  createOscillator(): OscillatorStub {
    const node = new OscillatorStub(); this.nodes.push(node); this.oscillators.push(node); return node;
  }
  async resume(): Promise<void> { this.state = 'running'; }
  async suspend(): Promise<void> { this.state = 'suspended'; }
  async close(): Promise<void> { this.state = 'closed'; }
}
let wrapper: VueWrapper;
let audio: ReturnType<typeof useGameAudio>;
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('AudioContext', AudioContextStub);
  localStorage.removeItem('reversi-sound');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  wrapper = mount(defineComponent({ setup() { audio = useGameAudio(); return () => null; } }));
  audio.changeScene('off');
});
afterEach(() => { wrapper.unmount(); vi.runOnlyPendingTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('character sound lifecycle', () => {
  it('releases all chuckle notes after the short phrase finishes', async () => {
    await audio.unlock();
    const context = AudioContextStub.latest, existingNodes = context.nodes.length;
    audio.sfx('laugh');
    expect(context.oscillators.length).toBeGreaterThan(1);
    vi.advanceTimersByTime(900);
    expect(context.nodes.slice(existingNodes).every(node => node.disconnect.mock.calls.length === 1)).toBe(true);
    const ended = context.oscillators.map(voice => voice.stop.mock.calls.length);
    audio.reset();
    expect(context.oscillators.map(voice => voice.stop.mock.calls.length)).toEqual(ended);
  });

  it('cancels future chuckle notes and disconnects their envelopes when muted', async () => {
    await audio.unlock();
    const context = AudioContextStub.latest, existingNodes = context.nodes.length;
    audio.sfx('laugh');
    await audio.toggle();
    vi.advanceTimersByTime(0);
    expect(context.state).toBe('suspended');
    expect(context.nodes.slice(existingNodes).every(node => node.disconnect.mock.calls.length === 1)).toBe(true);
    const voiceCount = context.oscillators.length;
    audio.sfx('laugh'); audio.sfx('whistle');
    expect(context.oscillators).toHaveLength(voiceCount);
  });

  it('does not schedule character sounds while the page is hidden', async () => {
    await audio.unlock();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    audio.sfx('laugh'); audio.sfx('whistle');
    expect(AudioContextStub.latest.oscillators).toHaveLength(0);
  });
});
