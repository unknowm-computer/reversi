<script setup lang="ts">
import AppIcon from './AppIcon.vue';

interface Props {
  showHome: boolean;
  showRematch: boolean;
  rematchRequested: boolean;
  rematchDisabled: boolean;
  soundEnabled: boolean;
}

defineProps<Props>();
const emit = defineEmits<{
  (event: 'home'): void;
  (event: 'rematch'): void;
  (event: 'rules'): void;
  (event: 'toggleSound'): void;
}>();
</script>

<template>
  <header class="site-header">
    <button class="brand" aria-label="잔나비와 베짱이 시작 화면" @click="emit('home')">
      <span class="brand-mark"><i /><i /></span>
      <span class="brand-name">잔나비와 베짱이<small>THE LITTLE BOARD GAME CLUB</small></span>
    </button>
    <nav aria-label="게임 안내">
      <button v-if="showHome" class="text-button nav-link" aria-label="처음으로" title="처음으로" @click="emit('home')">
        <AppIcon name="home" /><span>처음으로</span>
      </button>
      <button
        v-if="showRematch"
        class="text-button nav-link restart-button"
        :aria-label="rematchRequested ? '상대의 재대결 동의를 기다리는 중' : '다시하기'"
        :title="rematchRequested ? '상대의 재대결 동의를 기다리는 중' : '같은 설정으로 다시하기'"
        :disabled="rematchDisabled"
        @click="emit('rematch')"
      >
        <AppIcon name="restart" /><span>{{ rematchRequested ? '상대 대기 중' : '다시하기' }}</span>
      </button>
      <button class="text-button nav-link" aria-label="게임 방법" @click="emit('rules')">
        <AppIcon name="help" /><span>게임 방법</span>
      </button>
      <span class="nav-divider" />
      <button
        class="sound-button"
        :aria-label="soundEnabled ? '사운드 끄기' : '사운드 켜기'"
        :aria-pressed="soundEnabled"
        @click="emit('toggleSound')"
      >
        <AppIcon :name="soundEnabled ? 'sound' : 'muted'" />
      </button>
    </nav>
  </header>
</template>

<style scoped lang="scss">
@use '../../styles/tokens' as *;

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100px;
  border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: center; gap: 13px; text-align: left; }
.brand-mark { width: 36px; height: 36px; position: relative; }
.brand-mark i { position: absolute; width: 26px; height: 26px; border-radius: 50%; background: var(--green); left: 0; top: 0; }
.brand-mark i + i { background: #e9e9d5; border: 1px solid #b6bea1; left: 13px; top: 12px; box-shadow: 0 2px 2px #283c2e15; }
.brand-name { font-size: 19px; font-weight: 750; letter-spacing: -.035em; }
.brand-name small { display: block; font-family: ui-monospace, monospace; font-size: var(--text-micro); letter-spacing: .14em; color: var(--muted); margin-top: 5px; font-weight: 400; }
nav { display: flex; align-items: center; gap: 17px; }
.nav-link { font-size: var(--text-small); }
.nav-link svg { width: 16px; }
.nav-divider { height: 17px; width: 1px; background: var(--line); }
.sound-button { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid var(--line); border-radius: 50%; background: var(--card); }
.sound-button svg { width: 17px; }

@media (max-width: $mobile) {
  .site-header { height: 80px; }
  .brand-name { font-size: var(--text-body); }
  .brand-name small { font-size: var(--text-micro); }
  .brand-mark { width: 31px; }
  .brand { gap: 10px; }
  nav { gap: 9px; }
  .nav-divider { display: none; }
  .nav-link { padding: 8px; }
  .nav-link span { display: none; }
  .sound-button { width: 32px; height: 32px; }
  .site-header:has(.restart-button) .brand-mark,
  .site-header:has(.restart-button) .brand-name small { display: none; }
}
</style>
