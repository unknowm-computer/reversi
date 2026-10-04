<script setup lang="ts">
import { ref, useId } from 'vue';
import type { AiDifficulty, GameSettings } from '../../../shared/game/types';
import AppIcon from '../common/AppIcon.vue';

interface Props {
  modeName: string;
  aiDifficulty: AiDifficulty | null;
  roomCode: string | null;
  seconds: GameSettings['seconds'];
}

defineProps<Props>();
const expanded = ref<boolean>(false);
const contentId = useId();
</script>

<template>
  <aside class="match-details" aria-label="대국 정보">
    <button
      class="details-toggle"
      :aria-expanded="expanded"
      :aria-controls="contentId"
      @click="expanded = !expanded"
    >
      <span>대국 정보</span>
      <AppIcon name="arrow" :class="{ expanded }" />
    </button>
    <div :id="contentId" class="details-content" :class="{ 'is-open': expanded }">
      <div class="match-settings">
        <h2>대국 정보</h2>
        <dl>
          <div><dt>플레이</dt><dd>{{ modeName }}</dd></div>
          <div v-if="aiDifficulty !== null"><dt>AI 난이도</dt><dd>{{ aiDifficulty }}단계</dd></div>
          <div><dt>한 수 제한 시간</dt><dd>{{ seconds ? `${seconds}초` : '제한 없음' }}</dd></div>
          <div v-if="roomCode"><dt>방 코드</dt><dd class="room-code">{{ roomCode }}</dd></div>
        </dl>
      </div>
      <slot />
    </div>
  </aside>
</template>

<style scoped lang="scss">
@use '../../styles/tokens' as *;

.match-details { min-width: 0; }
.details-toggle { display: none; }
.details-content { display: grid; gap: var(--space-4); }
.match-settings {
  padding: var(--space-4);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
}
.match-settings h2 { font-size: var(--text-label); margin-bottom: var(--space-4); }
dl { display: grid; gap: var(--space-3); margin: 0; font-size: var(--text-caption); }
dl > div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-1) var(--space-2); }
dt { color: var(--muted); }
dd { margin: 0; }
.room-code { font-family: ui-monospace, monospace; letter-spacing: .08em; user-select: all; }

@media (max-width: $compact) {
  .details-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 44px;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--card);
    font-size: var(--text-small);
  }
  .details-toggle svg { width: 16px; height: 16px; transform: rotate(90deg); }
  .details-toggle svg.expanded { transform: rotate(-90deg); }
  .details-content { display: none; margin-top: var(--space-3); }
  .details-content.is-open { display: grid; }
  .match-settings h2 { display: none; }
}
</style>
