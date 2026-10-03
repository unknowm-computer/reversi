<script setup lang="ts">
import type { Character, GameSettings } from '../../../shared/game/types';
import TimeoutChoiceScene from './TimeoutChoiceScene.vue';

interface Props {
  recipient: Character;
  askingMercy: boolean;
  loserName: string;
  deciderName: string;
  seconds: GameSettings['seconds'];
  blocked: boolean;
  error: string | null;
}

defineProps<Props>();
const emit = defineEmits<{
  (event: 'choose', choice: 'forgive' | 'end'): void;
}>();
</script>

<template>
  <TimeoutChoiceScene :recipient="recipient" :begging="askingMercy" />
  <template v-if="askingMercy">
    <p class="confirm-text">자, 잠깐만요… 생각하다 보니 시간이 다 됐네요.<br>제가 잘못했어요. 제발 이번 한 번만 봐주세요!</p>
    <p class="confirm-text">꿀밤 한 대는 달게 받을게요. {{ seconds }}초만 더 주시면 안 될까요…?<br>더는 부탁하지 않으려면 패배를 인정하고 이번 판을 마칠 수 있어요.</p>
  </template>
  <template v-else>
    <p class="confirm-text">{{ loserName }}의 시간이 다 됐어요.<br>{{ deciderName }}, 이번엔 어떻게 할까요?</p>
    <p class="confirm-text">봐주면 꿀밤 한 대 후 같은 차례에서 {{ seconds }}초를 새로 드려요. 게임 종료를 선택하면 {{ deciderName }}의 승리예요.</p>
  </template>
  <div class="confirm-actions">
    <button class="secondary" :disabled="blocked" @click="emit('choose', 'forgive')">{{ askingMercy ? '제발 봐주세요' : '봐준다' }}</button>
    <button class="primary" :disabled="blocked" @click="emit('choose', 'end')">{{ askingMercy ? '패배를 인정한다' : '게임 종료' }}</button>
  </div>
  <p v-if="error" class="game-error" role="alert">{{ error }}</p>
  <p v-if="blocked" class="confirm-text">연결과 요청 처리를 기다리고 있어요.</p>
</template>

<style scoped lang="scss">
.confirm-text { color: var(--muted); font-size: var(--text-body); line-height: 1.8; }
.confirm-actions { display: flex; gap: 10px; margin-top: 25px; }
.confirm-actions button { flex: 1; font-size: var(--text-label); }
.game-error { color: var(--danger); font-size: var(--text-small); margin: 12px 0; }
</style>
