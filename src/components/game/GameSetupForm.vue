<script setup lang="ts">
import { computed, watch } from 'vue';
import {
  AI_DIFFICULTIES,
  JANGGI_FORMATIONS,
  characterName,
  gameName,
  otherCharacter,
  type GameSettings,
  type Mode,
} from '../../../shared/game/types';
import { useSetupSettings } from '../../composables/useSetupSettings';
import AppIcon from '../common/AppIcon.vue';
import GameTypePicker from '../common/GameTypePicker.vue';
import GameSetupPlayers from './GameSetupPlayers.vue';
import JanggiFormationPreview from './JanggiFormationPreview.vue';

interface Props {
  settings: GameSettings;
  busy: boolean;
  connected: boolean;
  error: string;
  allowSelection?: boolean;
  onlineRematch?: { phase: 'editing' | 'ready'; host: boolean; ready: boolean };
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (event: 'confirm', settings: GameSettings): void;
  (event: 'cancel'): void;
}>();
const { config } = useSetupSettings();
// Switching mode restores its saved timer synchronously, before the selected settings are applied.
config.mode = props.settings.mode;
function applySettings(settings: GameSettings): void {
  // Online always disables undo on the server; keep the saved local undo preference.
  const { undoLimit, ...sharedSettings } = settings;
  Object.assign(config, sharedSettings);
  if (settings.mode !== 'online') config.undoLimit = undoLimit;
}
applySettings(props.settings);
const readOnly = computed<boolean>(() => Boolean(props.onlineRematch && (!props.onlineRematch.host || props.onlineRematch.phase === 'ready')));
// The guest sees the host's confirmed settings; reconnects restore the same shared setup.
watch(() => props.settings, settings => {
  if (readOnly.value) applySettings(settings);
});

const modeLabels: Record<Mode, string> = { ai: '혼자 놀기', local: '함께 놀기', online: '온라인' };
const summary = computed<string>(() => `${gameName(config.gameType)} · ${modeLabels[config.mode]}`);
const unavailable = computed<boolean>(() => props.busy || (config.mode === 'online' && !props.connected)
  || Boolean(props.onlineRematch?.ready || (props.onlineRematch?.phase === 'editing' && !props.onlineRematch.host)));
const confirmLabel = computed<string>(() => {
  if (props.onlineRematch) {
    if (props.busy) return '준비하는 중…';
    if (props.onlineRematch.ready) return '친구의 준비를 기다리는 중…';
    if (props.onlineRematch.phase === 'ready') return '이 설정으로 준비 완료';
    return props.onlineRematch.host ? '설정 확정하기' : '방장이 설정하는 중…';
  }
  return props.busy ? (config.mode === 'online' ? '방 만드는 중…' : '대국 준비 중…')
    : (config.mode === 'online' ? '친구랑 놀 방 만들기' : '좋아, 시작하자!');
});
const rematchNotice = computed<string>(() => {
  if (!props.onlineRematch) return '';
  if (props.onlineRematch.phase === 'editing') return props.onlineRematch.host
    ? '이번 판의 설정을 정해 주세요. 친구가 확인하면 시작해요.'
    : '방장이 이번 판의 설정을 정하고 있어요. 잠시만 기다려 주세요.';
  return props.onlineRematch.ready ? '준비 완료! 친구도 준비하면 바로 시작해요.' : '이번 판의 설정을 확인하고 준비 완료를 눌러 주세요.';
});
const confirmAccessibleLabel = computed<string>(() => props.busy || config.mode === 'online' ? confirmLabel.value : `${confirmLabel.value} 대국 시작`);

function confirm(): void {
  if (!unavailable.value) emit('confirm', { ...config });
}
</script>

<template>
  <form class="game-setup-form" aria-label="대국 설정" @submit.prevent="confirm">
    <p v-if="!allowSelection" class="setup-summary"><AppIcon name="leaf" />{{ summary }}</p>
    <p v-if="rematchNotice" class="connection-status" role="status">{{ rematchNotice }}</p>
    <fieldset v-if="allowSelection" :disabled="busy || readOnly" class="game-selection">
      <legend>이번 판의 게임</legend>
      <GameTypePicker v-model="config.gameType" compact />
    </fieldset>
    <fieldset :disabled="busy || readOnly" class="player-settings">
      <legend class="sr-only">이번 판의 플레이어</legend>
      <GameSetupPlayers :settings="config" :self-color="onlineRematch && !onlineRematch.host ? 'white' : 'black'">
        <template v-if="config.gameType === 'janggi'" #black>
          <label class="formation-choice">
            <span>초 포진</span>
            <select v-model="config.janggiBlackFormation" :aria-label="`${characterName(config.blackCharacter)}의 초 포진`">
              <option v-for="formation in JANGGI_FORMATIONS" :key="formation.value" :value="formation.value">{{ formation.label.split(' · ')[0] }}</option>
            </select>
          </label>
          <JanggiFormationPreview :formation="config.janggiBlackFormation" color="black" />
        </template>
        <template v-if="config.gameType === 'janggi'" #white>
          <label class="formation-choice">
            <span>한 포진</span>
            <select v-model="config.janggiWhiteFormation" :aria-label="`${characterName(otherCharacter(config.blackCharacter))}의 한 포진`">
              <option v-for="formation in JANGGI_FORMATIONS" :key="formation.value" :value="formation.value">{{ formation.label.split(' · ')[0] }}</option>
            </select>
          </label>
          <JanggiFormationPreview :formation="config.janggiWhiteFormation" color="white" />
        </template>
      </GameSetupPlayers>
    </fieldset>
    <fieldset :disabled="busy || readOnly" class="setup-fields">
      <legend class="sr-only">시작 전 설정</legend>
      <label v-if="config.mode === 'ai'">
        <span class="setting-label"><AppIcon name="spark" />AI 난이도</span>
        <select v-model="config.aiDifficulty">
          <option v-for="level in AI_DIFFICULTIES" :key="level.value" :value="level.value">{{ level.value }}단계 · {{ level.label }}</option>
        </select>
      </label>
      <label>
        <span class="setting-label"><AppIcon name="clock" />한 수 제한 시간</span>
        <select v-model="config.seconds">
          <option :value="0">시간 제한 없음</option>
          <option :value="30">30초 · 가볍게</option>
          <option :value="60">60초 · 여유롭게</option>
        </select>
      </label>
      <label v-if="config.mode === 'local'">
        <span class="setting-label"><AppIcon name="undo" />무르기 기회</span>
        <select v-model="config.undoLimit">
          <option :value="1">인당 1회</option>
          <option :value="3">인당 3회</option>
          <option :value="-1">무제한</option>
          <option :value="0">사용 안 함</option>
        </select>
      </label>
    </fieldset>
    <p v-if="config.mode === 'online' && !connected" class="connection-status" role="status">서버에 연결 중…</p>
    <p v-if="error" class="setup-error" role="alert">{{ error }}</p>
    <div class="setup-actions">
      <button type="button" class="secondary" :disabled="busy" @click="emit('cancel')">{{ onlineRematch ? '방 나가기' : '돌아가기' }}</button>
      <button type="submit" class="primary" :aria-label="confirmAccessibleLabel" :disabled="unavailable">{{ confirmLabel }}<AppIcon name="arrow" /></button>
    </div>
  </form>
</template>

<style scoped lang="scss">
@use '../../styles/tokens' as *;

.game-setup-form { display: grid; gap: var(--space-4); }
.setup-summary { display: flex; align-items: center; justify-content: center; gap: var(--space-2); color: var(--text-accent); font-size: var(--text-small); }
.setup-summary svg { width: 16px; height: 16px; }
.player-settings { min-width: 0; margin: 0; padding: 0; border: 0; }
.game-selection { min-width: 0; margin: 0; padding: 0; border: 0; }
.game-selection legend { margin-bottom: var(--space-2); font-size: var(--text-small); }
.formation-choice { display: grid; gap: var(--space-1); font-size: var(--text-caption); text-align: left; }
.formation-choice select { min-width: 0; width: 100%; padding-inline-start: var(--space-2); font-size: var(--text-small); }
.setup-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); min-width: 0; margin: 0; padding: var(--space-3); border: 1px dashed var(--line); border-radius: 16px; background: var(--paper); }
.setup-fields label { display: grid; gap: var(--space-2); min-width: 0; font-size: var(--text-small); }
.setup-fields label:last-child:nth-of-type(odd) { grid-column: 1 / -1; }
.setup-fields select { min-width: 0; width: 100%; padding-inline-start: var(--space-2); }
.setting-label { display: flex; align-items: center; gap: var(--space-1); }
.setting-label svg { width: 15px; height: 15px; color: var(--text-accent); }
.connection-status, .setup-error { font-size: var(--text-small); }
.connection-status { color: var(--muted); }
.setup-error { color: var(--danger); }
.setup-actions { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-2); }
.setup-actions button { padding-inline: var(--space-3); }
.setup-actions .primary { gap: var(--space-2); }
.setup-actions svg { width: 18px; height: 18px; flex-shrink: 0; }

@media (max-width: $mobile) {
  .game-setup-form { gap: var(--space-3); }
  .setup-fields { grid-template-columns: minmax(0, 1fr); padding: var(--space-2); gap: var(--space-2); }
  .setup-fields label { gap: var(--space-1); }
  .setup-actions { grid-template-columns: minmax(0, 1fr); }
  .setup-actions .primary { grid-row: 1; }
  .setup-actions .secondary { padding-block: var(--space-1); min-height: 36px; }
}
</style>
