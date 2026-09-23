import { onUnmounted, ref } from 'vue';
import type { Color } from '../../shared/game/types';
import { TIMEOUT_PENALTY_HIT_MS, TIMEOUT_PENALTY_MS } from '../../shared/game/types';
export { TIMEOUT_PENALTY_MS } from '../../shared/game/types';
/** A cosmetic interruption: board, turn, score and undo history are untouched. */
export function useTimeoutPenalty(onComplete: () => void, onHit?: () => void) {
  const recipient = ref<Color | null>(null);
  // This is the initial animation offset; CSS handles subsequent pauses itself.
  const elapsed = ref(0);
  let handle: number | undefined;
  let hitHandle: number | undefined;
  let remaining = 0;
  let deadline = 0;
  let hitPlayed = false;
  function clearTimers(): void {
    window.clearTimeout(handle); window.clearTimeout(hitHandle);
    handle = undefined; hitHandle = undefined;
  }
  function resume(): void {
    if (!recipient.value || handle !== undefined) return;
    deadline = Date.now() + remaining;
    if (!hitPlayed) {
      hitHandle = window.setTimeout(() => {
        hitHandle = undefined; hitPlayed = true; onHit?.();
      }, Math.max(0, remaining - (TIMEOUT_PENALTY_MS - TIMEOUT_PENALTY_HIT_MS)));
    }
    handle = window.setTimeout(() => {
      clearTimers(); remaining = 0; recipient.value = null; onComplete();
    }, remaining);
  }
  function begin(color: Color, duration = TIMEOUT_PENALTY_MS): void {
    clearTimers();
    remaining = Math.min(TIMEOUT_PENALTY_MS, Math.max(0, duration));
    elapsed.value = Math.max(0, TIMEOUT_PENALTY_MS - duration);
    // Reconnecting after contact must not replay an impact already shown.
    hitPlayed = elapsed.value >= TIMEOUT_PENALTY_HIT_MS;
    recipient.value = color; resume();
  }
  function pause(): void {
    if (!recipient.value || handle === undefined) return;
    remaining = Math.max(0, deadline - Date.now()); clearTimers();
  }
  function cancel(): void { clearTimers(); recipient.value = null; remaining = 0; elapsed.value = 0; }
  onUnmounted(cancel);
  return { recipient, elapsed, begin, pause, resume, cancel };
}
