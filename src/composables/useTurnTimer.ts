import { ref, onUnmounted } from 'vue';
export function useTurnTimer(onTimeout: () => void) {
  const remaining = ref(0);
  let deadline: number | null = null;
  let running = false;
  let remote = false;
  let offset = 0;
  function update(): void {
    if (!running || deadline === null) return;
    remaining.value = Math.max(0, deadline - (Date.now() + offset));
    if (remaining.value === 0 && !remote) { running = false; onTimeout(); }
  }
  const interval = window.setInterval(update, 100);
  function start(milliseconds: number): void {
    remote = false; offset = 0; remaining.value = milliseconds;
    deadline = milliseconds > 0 ? Date.now() + milliseconds : null; running = milliseconds > 0;
  }
  function sync(nextDeadline: number | null, serverNow: number): void {
    remote = true; offset = serverNow - Date.now(); deadline = nextDeadline;
    running = deadline !== null; remaining.value = deadline === null ? 0 : Math.max(0, deadline - serverNow); update();
  }
  function pause(): void { update(); running = false; }
  function resume(): void { if (!remote && remaining.value > 0) { deadline = Date.now() + remaining.value; running = true; } }
  function stop(): void { running = false; deadline = null; }
  onUnmounted(() => window.clearInterval(interval));
  return { remaining, start, pause, resume, stop, sync, update };
}
