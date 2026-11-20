<script setup lang="ts">
import { gameName, type GameType, type Mode } from "../../../shared/game/types";
import GamePreview from "../game/GamePreview.vue";
import AppIcon from "./AppIcon.vue";

interface Props {
  modelValue?: GameType;
  compact?: boolean;
  mode?: Mode;
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: "reversi",
  compact: false,
});
function unavailable(game: GameType): boolean {
  return props.mode === "local" && game === "battleship";
}
const emit = defineEmits<{
  (event: "update:modelValue", gameType: GameType): void;
}>();
const games: { value: GameType; description: string }[] = [
  { value: "reversi", description: "뒤집는 재미, 마지막까지" },
  { value: "gomoku", description: "다섯 알을 나란히" },
  { value: "chess", description: "상대 킹을 체크메이트" },
  { value: "janggi", description: "초와 한의 한판 승부" },
  { value: "battleship", description: "숨은 함대를 격파하세요" },
];
</script>

<template>
  <div
    class="game-picker"
    :class="{ compact }"
    role="group"
    aria-label="게임 선택"
  >
    <button
      v-for="game in games"
      :key="game.value"
      :disabled="unavailable(game.value)"
      type="button"
      class="game-option"
      :class="{ selected: modelValue === game.value }"
      :aria-pressed="modelValue === game.value"
      @click="emit('update:modelValue', game.value)"
    >
      <span v-if="unavailable(game.value)" class="game-option__lock"
        ><AppIcon name="lock"
      /></span>
      <GamePreview v-else :game-type="game.value" />
      <span class="game-caption">
        <strong>{{ gameName(game.value) }}</strong>
        <span v-if="unavailable(game.value)">함께 놀기 이용 불가</span>
        <span v-else-if="!compact">{{ game.description }}</span>
      </span>
      <span class="game-check" aria-hidden="true">{{
        modelValue === game.value ? "✓" : ""
      }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "../../styles/tokens" as *;
.game-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.game-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--line);
  border-radius: 13px;
  text-align: left;
}
.game-option.selected {
  background: #f0f3e5;
  border-color: #819566;
  box-shadow: inset 0 0 0 1px #819566;
}
.game-option[disabled] {
  opacity: 0.6;
  border-style: dashed;
  border-color: #a5a69c;
  background: #eeeee7;
  color: var(--muted);
}
.game-option__lock {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 7px;
  background: var(--line);
}
.game-caption {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.game-caption strong {
  font-size: var(--text-body);
}
.game-caption > span {
  font-size: var(--text-caption);
  line-height: 1.4;
  color: var(--muted);
}
.game-check {
  position: absolute;
  top: 3px;
  right: 6px;
  font-size: var(--text-caption);
  color: var(--text-accent);
}
.compact {
  gap: var(--space-2);
}
.compact .game-option {
  padding: var(--space-2);
}
.compact .game-preview,
.compact .game-option__lock {
  width: 32px;
  height: 32px;
}
.compact .game-caption strong {
  font-size: var(--text-small);
}
@media (max-width: $mobile) {
  .game-picker:not(.compact) .game-option {
    flex-direction: column;
    text-align: center;
    padding: var(--space-3) var(--space-2);
  }
}
</style>
