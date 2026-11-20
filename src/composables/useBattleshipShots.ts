import { onUnmounted, ref, watch } from 'vue';
import { isPlacement } from '../../shared/game/engine';
import type { Color, GameState, Shot } from '../../shared/game/types';

export const SHOT_EFFECT_MS = 780;

export const SHOT_IMPACT_MS = SHOT_EFFECT_MS * .38;
export const WRECK_REVEAL_MS = 1550;

export function useBattleshipShots(state: () => GameState, onImpact: (outcome: NonNullable<Shot>) => void) {
  const active = ref<Record<Color, number | null>>({ black: null, white: null });
  const surfacing = ref<Record<Color, number[]>>({ black: [], white: [] });
  const revealTimers = new Set<number>();
  const timers: Partial<Record<Color, number>> = {};
  function clear(side: Color): void {
    window.clearTimeout(timers[side]);
    active.value[side] = null;
  }
  function scheduleReveal(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      revealTimers.delete(timer);
      callback();
    }, delay);
    revealTimers.add(timer);
  }
  function reset(): void {
    clear('black'); clear('white');
    revealTimers.forEach(timer => window.clearTimeout(timer));
    revealTimers.clear();
    surfacing.value = { black: [], white: [] };
  }
  watch(state, (next, before) => {
    if (!next.battleship && !before.battleship) return;
    if (next.gameId !== before.gameId || next.revision !== before.revision && !isPlacement(before, next)) {
      reset();
      return;
    }
    if (next.revision === before.revision || document.hidden) return;
    const actor = before.turn;
    const index = next.lastMove;
    if (index === null) return;
    const outcome = next.battleship?.shots[actor][index];
    if (!outcome) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onImpact(outcome);
      return;
    }
    clear(actor);
    active.value[actor] = index;
    scheduleReveal(() => onImpact(outcome), SHOT_IMPACT_MS);
    if (outcome === 'sunk') {
      surfacing.value[actor].push(index);
      scheduleReveal(() => {
        surfacing.value[actor] = surfacing.value[actor].filter(cell => cell !== index);
      }, WRECK_REVEAL_MS);
    }
    timers[actor] = window.setTimeout(() => clear(actor), SHOT_EFFECT_MS);
  }, { flush: 'sync' });
  onUnmounted(reset);
  return { active, surfacing };
}
