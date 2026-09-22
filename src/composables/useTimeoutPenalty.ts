import { onUnmounted, ref } from 'vue';
import type { Color } from '../../shared/game/types';
import { TIMEOUT_PENALTY_MS } from '../../shared/game/types';
export { TIMEOUT_PENALTY_MS } from '../../shared/game/types';
/** A cosmetic interruption: board, turn, score and undo history are untouched. */
export function useTimeoutPenalty(onComplete: () => void) {
  const recipient = ref<Color | null>(null);
  let handle: number | undefined;
  let remaining = 0;
  let deadline = 0;
  function resume(): void {
    if (!recipient.value) return;
    deadline = Date.now() + remaining;
    handle = window.setTimeout(() => { recipient.value = null; onComplete(); }, remaining);
  }
  function begin(color: Color, duration = TIMEOUT_PENALTY_MS): void {
    window.clearTimeout(handle);
    recipient.value = color; remaining = Math.max(0, duration); resume();
  }
  function pause(): void {
    if (!recipient.value) return;
    remaining = Math.max(0, deadline - Date.now()); window.clearTimeout(handle);
  }
  function cancel(): void { window.clearTimeout(handle); recipient.value = null; remaining = 0; }
  onUnmounted(cancel);
  return { recipient, begin, pause, resume, cancel };
}
