import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

export type PadDirection = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
interface GamepadActions { direction: (direction: PadDirection) => void; confirm: () => void }

/** Standard mapping: left stick / D-pad and the bottom face button (A / ×). */
export function useGamepad(enabled: Readonly<Ref<boolean>>, actions: GamepadActions) {
  const status = ref<'waiting' | 'connected' | 'unsupported' | 'unavailable'>('waiting');
  const active = ref(false);
  let frame = 0;
  let selected: string | null = null;
  let armed = false;
  let wasPressed = false;
  let held: PadDirection | null = null;
  let repeatAt = 0;
  let focused = true;

  function reset(): void { armed = false; wasPressed = false; held = null; active.value = false; }
  function blur(): void { focused = false; reset(); }
  function focus(): void { focused = true; reset(); }
  function visibility(): void { reset(); }
  function disconnect(): void { selected = null; reset(); }
  function pointer(): void { active.value = false; }
  watch(enabled, reset, { flush: 'sync' });

  function poll(now: number): void {
    frame = requestAnimationFrame(poll);
    let pads: (Gamepad | null)[];
    try { pads = Array.from(navigator.getGamepads()); }
    catch { status.value = 'unavailable'; reset(); return; }
    const connected = pads.filter((pad): pad is Gamepad => Boolean(pad?.connected));
    const supported = connected.filter(pad => pad.mapping === 'standard');
    const pad = supported.find(candidate => `${candidate.index}:${candidate.id}` === selected) ?? supported[0];
    status.value = pad ? 'connected' : connected.length ? 'unsupported' : 'waiting';
    if (!pad) { selected = null; reset(); return; }
    const identity = `${pad.index}:${pad.id}`;
    if (selected !== identity) { selected = identity; reset(); }
    if (!enabled.value || !focused || document.hidden) { reset(); return; }

    const pressed = (index: number): boolean => Boolean(pad.buttons[index]?.pressed);
    const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
    let direction: PadDirection | null = null;
    if (pressed(12)) direction = 'ArrowUp';
    else if (pressed(13)) direction = 'ArrowDown';
    else if (pressed(14)) direction = 'ArrowLeft';
    else if (pressed(15)) direction = 'ArrowRight';
    else if (Math.max(Math.abs(x), Math.abs(y)) >= 0.55) {
      direction = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'ArrowRight' : 'ArrowLeft') : (y > 0 ? 'ArrowDown' : 'ArrowUp');
    }
    const confirm = pressed(0);
    // Require release after connection, focus changes, or any input lock.
    if (!armed) { if (!direction && !confirm) armed = true; return; }
    if (direction !== held || (direction && now >= repeatAt)) {
      if (direction) {
        active.value = true;
        actions.direction(direction);
        repeatAt = now + (direction !== held ? 320 : 120);
      }
      held = direction;
    }
    if (confirm && !wasPressed) { active.value = true; actions.confirm(); }
    wasPressed = confirm;
  }

  onMounted(() => {
    if (typeof navigator.getGamepads !== 'function') { status.value = 'unavailable'; return; }
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    window.addEventListener('gamepaddisconnected', disconnect);
    window.addEventListener('pointerdown', pointer);
    window.addEventListener('keydown', pointer);
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(poll);
  });
  onUnmounted(() => {
    cancelAnimationFrame(frame);
    window.removeEventListener('blur', blur);
    window.removeEventListener('focus', focus);
    window.removeEventListener('gamepaddisconnected', disconnect);
    window.removeEventListener('pointerdown', pointer);
    window.removeEventListener('keydown', pointer);
    document.removeEventListener('visibilitychange', visibility);
  });
  return { status, active };
}
