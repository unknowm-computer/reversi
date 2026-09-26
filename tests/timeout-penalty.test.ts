// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { useTimeoutPenalty } from '../src/composables/useTimeoutPenalty';
import CharacterArt from '../src/components/game/CharacterArt.vue';
import TimeoutPenalty from '../src/components/game/TimeoutPenalty.vue';
import { characterName, otherCharacter, TIMEOUT_PENALTY_HIT_MS, TIMEOUT_PENALTY_MS, type Character } from '../shared/game/types';

let wrapper: VueWrapper;
let scene: VueWrapper | undefined;
let penalty: ReturnType<typeof useTimeoutPenalty>;
const complete = vi.fn(), hit = vi.fn();

beforeEach(() => {
  vi.useFakeTimers(); complete.mockClear(); hit.mockClear();
  wrapper = mount(defineComponent({ setup() {
    penalty = useTimeoutPenalty(complete, hit);
    return () => null;
  } }));
});
afterEach(() => { scene?.unmount(); scene = undefined; wrapper.unmount(); vi.useRealTimers(); });

describe('Shared timeout bonk scene', () => {
  const recipients: Character[] = ['jannabi', 'grasshopper'];

  it.each(recipients)('shows only the %s recipient with the same bonk message', recipient => {
    scene = mount(TimeoutPenalty, { props: { recipient, paused: false } });

    const characters = scene.findAllComponents(CharacterArt);
    expect(characters).toHaveLength(1);
    expect(characters[0]!.props('character')).toBe(recipient);
    expect(scene.find('.giver, .strike-arm, .tap-bow').exists()).toBe(false);
    expect(scene.get('strong').text()).toBe('꿀밤 한 대, 다시 집중!');
    expect(scene.text()).not.toContain('활로');

    const announcement = scene.get('[role="status"]').attributes('aria-label');
    expect(announcement).toContain(characterName(recipient));
    expect(announcement).toContain('꿀밤');
    expect(announcement).not.toContain(characterName(otherCharacter(recipient)));
    expect(announcement).not.toContain('활로');
  });

  it.each(recipients)('preserves the shared animation offset while pausing and resuming %s', async recipient => {
    scene = mount(TimeoutPenalty, { props: { recipient, paused: true, elapsed: 500 } });
    const status = scene.get('[role="status"]');
    const element = status.element as HTMLElement;

    expect(status.classes()).toContain('paused');
    expect(element.style.getPropertyValue('--penalty-delay')).toBe('-500ms');
    expect(element.style.getPropertyValue('--penalty-duration')).toBe(`${TIMEOUT_PENALTY_MS}ms`);

    await scene.setProps({ paused: false });
    expect(status.classes()).not.toContain('paused');
    expect(element.style.getPropertyValue('--penalty-delay')).toBe('-500ms');

    await scene.setProps({ elapsed: TIMEOUT_PENALTY_HIT_MS, paused: true });
    expect(status.classes()).toContain('paused');
    expect(element.style.getPropertyValue('--penalty-delay')).toBe(`-${TIMEOUT_PENALTY_HIT_MS}ms`);
    expect(scene.findAllComponents(CharacterArt)).toHaveLength(1);
    expect(scene.findComponent(CharacterArt).props('character')).toBe(recipient);
  });
});

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
