<script setup lang="ts">
import type { GameSettings } from '../../../shared/game/types';
import AppIcon from '../common/AppIcon.vue';

interface Props {
  modeName: string;
  roomCode: string | null;
  seconds: GameSettings['seconds'];
}

defineProps<Props>();
const emit = defineEmits<{
  (event: 'rules'): void;
}>();
</script>

<template>
  <aside class="game-story">
    <p class="eyebrow muted">{{ modeName }}<span v-if="roomCode"> · {{ roomCode }}</span></p>
    <h1>작은 한 수가<br>판을 바꾸니까.</h1>
    <p>서두르지 않아도 괜찮아요.<br>다음 한 수를 즐겨보세요.</p>
    <div class="story-divider" />
    <div class="match-info">
      <span>오늘의 규칙</span>
      <strong>{{ seconds ? `한 수에 ${seconds}초` : '시간 제한 없이, 여유롭게' }}</strong>
    </div>
    <button class="text-button story-help" @click="emit('rules')">처음이라면, 게임 방법<AppIcon name="arrow" /></button>
    <div class="story-quote">“끝날 때까지<br>끝난 게 아니지!”<span>— 잔나비, 언제나 자신 있게</span></div>
  </aside>
</template>

<style scoped lang="scss">
@use '../../styles/tokens' as *;

.game-story { padding-top: 4px; }
.game-story .eyebrow { font-family: inherit; font-size: var(--text-caption); letter-spacing: .05em; }
.game-story h1 { font-size: clamp(25px, 2.5vw, 34px); line-height: 1.5; letter-spacing: -.06em; margin: 16px 0; }
.game-story > p:not(.eyebrow) { font-size: var(--text-small); color: var(--muted); line-height: 1.9; }
.story-divider { width: 28px; height: 1px; background: #b6bda2; margin: 32px 0; }
.match-info { display: flex; flex-direction: column; gap: 10px; }
.match-info > span { font-size: var(--text-caption); color: var(--muted); line-height: 1.7; }
.match-info > strong { font-size: var(--text-label); }
.story-help { font-size: var(--text-caption); margin: 18px 0 0 -10px; }
.story-help svg { width: 14px; }
.story-quote { margin-top: 45px; color: var(--text-accent); font-family: Georgia, serif; font-size: 21px; line-height: 1.6; letter-spacing: -.04em; }
.story-quote span { display: block; font-family: system-ui, sans-serif; font-size: var(--text-caption); margin-top: 12px; letter-spacing: 0; color: var(--muted); }

@media (max-width: $mobile) {
  .game-story { display: none; }
}
</style>
