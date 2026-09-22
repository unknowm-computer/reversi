<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { DEFAULT_SETTINGS, type GameSettings, type Mode, otherCharacter, characterName } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
import AppIcon from '../common/AppIcon.vue';
interface Props { connected: boolean; busy: boolean; error: string }
defineProps<Props>();
const emit = defineEmits<{
  (event: 'start', settings: GameSettings): void;
  (event: 'online'): void;
  (event: 'create', settings: GameSettings): void;
  (event: 'join', settings: GameSettings, code: string): void;
}>();
const config = reactive<GameSettings>({ ...DEFAULT_SETTINGS });
const modeSeconds: Record<Mode, GameSettings['seconds']> = { ai: 30, local: 30, online: 30 };
const code = ref('');
const modes: { value: Mode; label: string; icon: 'spark' | 'users' | 'globe' }[] = [{ value: 'ai', label: '혼자 놀기', icon: 'spark' }, { value: 'local', label: '함께 놀기', icon: 'users' }, { value: 'online', label: '온라인', icon: 'globe' }];
watch(() => config.mode, (mode, previous) => {
  modeSeconds[previous] = config.seconds;
  config.seconds = modeSeconds[mode];
  if (mode === 'online') emit('online');
  if (mode === 'ai') config.blackCharacter = 'grasshopper';
});
</script>
<template>
  <div class="setup-layout">
    <section class="welcome">
      <div class="edition"><span class="tiny-disc" /><span class="eyebrow">A LITTLE RIVALRY, A LITTLE JOY</span></div>
      <h1>한 수의 여유,<br>한 판의 <span>즐거움.</span></h1>
      <p class="intro">꾀 많은 잔나비와 느긋한 베짱이.<br>작은 보드 위에서 펼쳐지는 유쾌한 두뇌 싸움!</p>
      <div class="illustration" aria-label="리버시 보드를 사이에 두고 만난 잔나비와 베짱이" role="img">
        <div class="orbit orbit-one" /><div class="orbit orbit-two" />
        <span class="speech speech-monkey">이번엔 내가 이길걸?</span>
        <span class="speech speech-bug">한 수만 더 생각해 볼까 ♪</span>
        <div class="hero-monkey"><CharacterArt character="jannabi" /></div>
        <div class="hero-bug"><CharacterArt character="grasshopper" /></div>
        <div class="mini-board" aria-hidden="true"><div v-for="n in 36" :key="n" class="mini-cell"><span v-if="[9,15,16,21,22,28].includes(n)" :class="n % 3 === 0 ? 'mini-black' : 'mini-white'" /></div></div>
        <span class="hero-spark spark-a">✦</span><span class="hero-spark spark-b">✧</span>
        <div class="club-stamp">THE LITTLE<br><strong>REVERSI</strong><br>CLUB · EST. 2026</div>
      </div>
      <div class="welcome-foot"><span>01 — 64개의 칸, 무한한 가능성</span><span>천천히, 즐겁게.</span></div>
    </section>
    <section class="setup-card" aria-labelledby="setup-title">
      <div class="card-heading"><div><p class="eyebrow muted">LET'S PLAY</p><h2 id="setup-title">오늘의 한 판</h2></div><span class="card-leaf"><AppIcon name="leaf" /></span></div>
      <div class="mode-tabs" role="group" aria-label="대전 모드"><button v-for="mode in modes" :key="mode.value" :aria-pressed="config.mode === mode.value" :class="{ selected: config.mode === mode.value }" @click="config.mode = mode.value"><AppIcon :name="mode.icon" />{{ mode.label }}</button></div>
      <div class="mode-description"><span class="status-dot" />{{ config.mode === 'ai' ? '잔나비와 가볍게 실력을 겨뤄보세요.' : config.mode === 'local' ? '한 기기에서 번갈아 돌을 놓아보세요.' : '친구에게 방 코드를 보내 함께 즐겨보세요.' }}</div>
      <div class="field-heading"><h3>{{ config.mode === 'ai' ? '오늘의 플레이어' : '선공 캐릭터 선택' }}</h3><span>흑돌이 먼저 시작해요</span></div>
      <div class="character-picker" role="group" aria-label="선공 캐릭터">
        <button v-for="character in ['grasshopper', 'jannabi'] as const" :key="character" class="character-option" :class="{ chosen: config.blackCharacter === character }" :disabled="config.mode === 'ai' && character === 'jannabi'" :aria-pressed="config.blackCharacter === character" @click="config.blackCharacter = character">
          <span class="character-check">{{ config.blackCharacter === character ? '✓' : '' }}</span>
          <div class="picker-art"><CharacterArt :character="character" /></div><strong>{{ characterName(character) }}</strong><span>{{ character === 'grasshopper' ? '느긋한 전략가' : '장난꾸러기 승부사' }}</span>
        </button>
      </div>
      <div class="opponent-note">상대는 <strong>{{ characterName(otherCharacter(config.blackCharacter)) }}</strong>{{ config.mode === 'ai' ? ' AI' : '' }} · 백돌로 함께해요</div>
      <div class="settings-row">
        <label><span>한 수 제한 시간</span><select v-model="config.seconds"><option :value="0">시간 제한 없음</option><option :value="30">30초 · 가볍게</option><option :value="60">60초 · 여유롭게</option></select></label>
        <label v-if="config.mode === 'local'"><span>무르기 기회</span><select v-model="config.undoLimit"><option :value="1">인당 1회</option><option :value="3">인당 3회</option><option :value="-1">무제한</option><option :value="0">사용 안 함</option></select></label>
        <div v-else class="undo-info"><span>무르기 기회</span><strong><AppIcon name="undo" />{{ config.mode === 'ai' ? '마음껏, 무제한' : '온라인은 사용 안 함' }}</strong></div>
      </div>
      <p v-if="config.seconds" class="timeout-note">{{ config.mode === 'ai' ? '시간이 다 되면 꿀밤 한 대! 같은 차례에서 시간을 새로 드려요.' : '시간이 다 되면 상대가 봐주거나 게임을 끝낼 수 있어요.' }}</p>
      <template v-if="config.mode === 'online'">
        <button class="primary start-button" :disabled="!connected || busy" @click="emit('create', { ...config })">{{ connected ? '새로운 방 만들기' : '서버에 연결 중…' }}<AppIcon name="arrow" /></button>
        <form class="join-form" @submit.prevent="emit('join', { ...config }, code)"><label class="sr-only" for="room-code">친구의 방 코드</label><input id="room-code" v-model="code" placeholder="친구의 방 코드 6자리" maxlength="6" pattern="[A-Za-z2-9]{6}" required autocomplete="off" /><button class="secondary" :disabled="!connected || busy">입장</button></form>
      </template>
      <button v-else class="primary start-button" @click="emit('start', { ...config })">한 판 시작하기<AppIcon name="arrow" /></button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p class="card-foot">{{ config.mode === 'online' ? '방 코드를 아는 친구와 둘이서 즐길 수 있어요.' : '설치는 필요 없어요. 가벼운 마음만 준비하세요.' }}</p>
    </section>
  </div>
</template>
<style scoped lang="scss">
@use '../../styles/tokens' as *;
.setup-layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(380px, .85fr); gap: 70px; align-items: center; padding: 60px 0 48px; }
.edition { display: flex; gap: 10px; align-items: center; margin-bottom: 25px; }
.tiny-disc { width: 11px; height: 11px; background: var(--green); border-radius: 50%; }
h1 { font-size: clamp(40px, 4.5vw, 64px); letter-spacing: -.065em; line-height: 1.27; font-weight: 750; }
h1 > span { color: var(--text-accent); }
.intro { color: var(--muted); font-size: var(--text-body); line-height: 1.85; margin-top: 23px; }
.illustration { position: relative; height: 280px; margin-top: 15px; }
.orbit { position: absolute; border: 1px solid #dfe2d1; border-radius: 50%; width: 380px; height: 190px; left: 10%; top: 63px; transform: rotate(-12deg); }
.orbit-two { transform: rotate(12deg); width: 340px; left: 16%; }
.hero-monkey { position: absolute; width: 192px; height: 204px; left: 1%; top: 35px; transform: rotate(-5deg); z-index: 1; }
.hero-bug { position: absolute; width: 190px; height: 200px; right: 0; top: 29px; transform: rotate(5deg); z-index: 1; }
.speech { position: absolute; font-size: var(--text-small); background: var(--card); border: 1px solid var(--line); border-radius: 10px 10px 10px 0; padding: 8px 12px; white-space: nowrap; z-index: 2; }
.speech-monkey { left: 3%; top: 12px; transform: rotate(-7deg); }
.speech-bug { right: 0; top: 3px; transform: rotate(5deg); }
.mini-board { display: grid; grid-template-columns: repeat(6, 1fr); width: 164px; height: 150px; position: absolute; left: 50%; bottom: 13px; transform: translateX(-50%) perspective(500px) rotateX(44deg) rotateZ(-13deg); background: #618165; border: 10px solid #365b48; border-radius: 6px; box-shadow: -2px 6px 0 #274534, 0 12px 20px #364d3022; z-index: 2; }
.mini-cell { border: .5px solid #37583e66; display: grid; place-items: center; }
.mini-cell > span { width: 88%; aspect-ratio: 1; border-radius: 50%; box-shadow: 1px 2px 0 #182f2655; }
.mini-black { background: #233f31; }.mini-white { background: #f2edda; }
.hero-spark { position: absolute; color: #b0b984; font-size: 24px; }.spark-a { left: 47%; top: 40px; }.spark-b { right: 5%; bottom: 19px; }
.club-stamp { position: absolute; right: 7%; bottom: -5px; width: 100px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #acb699; border-radius: 50%; color: var(--text-accent); font-size: var(--text-micro); letter-spacing: .02em; transform: rotate(13deg); line-height: 1.1; }.club-stamp strong { font-size: var(--text-small); }
.welcome-foot { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 21px; border-top: 1px solid var(--line); color: var(--muted); font-size: var(--text-small); }
.setup-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 30px; box-shadow: 0 8px 24px #343f2510; }
.card-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }h2 { font-size: 26px; margin-top: 9px; letter-spacing: -.04em; }
.card-leaf { width: 46px; height: 46px; display: grid; place-items: center; background: #edf0e2; border-radius: 50%; color: #75916b; }.card-leaf svg { width: 24px; height: 24px; }
.mode-tabs { display: flex; padding: 5px; border-radius: 12px; background: #eeeee5; gap: 3px; }.mode-tabs button { flex: 1; font-size: var(--text-small); font-weight: 600; padding: 11px 2px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 9px; color: var(--muted); }.mode-tabs svg { width: 15px; height: 15px; }.mode-tabs button.selected { background: var(--card); color: var(--ink); box-shadow: 0 2px 5px #29372912; }
.mode-description { display: flex; line-height: 1.6; align-items: center; gap: 7px; font-size: var(--text-small); color: var(--muted); padding: 17px 0 26px; }.status-dot { width: 5px; height: 5px; border-radius: 50%; background: #91a371; }
.field-heading { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; margin-bottom: 13px; }h3 { font-size: var(--text-label); }.field-heading > span { color: var(--muted); font-size: var(--text-caption); }
.character-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.character-option { position: relative; display: flex; flex-direction: column; align-items: center; border: 1px solid var(--line); border-radius: 13px; padding: 7px 6px 14px; }.character-option.chosen { border-color: #819566; background: #f0f3e5; box-shadow: inset 0 0 0 1px #819566; }.character-option:disabled { opacity: .85; }.picker-art { width: 91px; height: 91px; }.character-option strong { font-size: var(--text-body); margin-top: 2px; }.character-option > span:last-child { font-size: var(--text-caption); color: var(--muted); margin-top: 4px; }.character-check { position: absolute; top: 11px; right: 11px; width: 20px; height: 20px; border: 1px solid #c8cfbb; border-radius: 50%; font-size: var(--text-caption); }.chosen .character-check { background: #78935f; border-color: #78935f; color: white; }
.opponent-note { font-size: var(--text-caption); color: var(--muted); text-align: center; margin: 11px 0 24px; }
.settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border-top: 1px solid var(--line); padding-top: 20px; }.settings-row label, .undo-info { display: flex; flex-direction: column; gap: 9px; font-size: var(--text-small); }.settings-row select { width: 100%; padding: 8px 10px; min-height: 40px; font-size: var(--text-small); background: #f6f5ee; }.undo-info strong { display: flex; gap: 6px; align-items: center; font-size: var(--text-small); min-height: 40px; font-weight: 500; }.undo-info svg { width: 15px; }
.start-button { width: 100%; margin-top: 25px; font-size: var(--text-body); justify-content: space-between; }.card-foot { line-height: 1.7; font-size: var(--text-caption); color: var(--muted); text-align: center; margin-top: 14px; }.error { color: var(--danger); font-size: var(--text-small); margin-top: 12px; line-height: 1.5; }.join-form { display: flex; gap: 8px; margin-top: 12px; }.join-form input { min-width: 0; flex: 1; font-size: var(--text-small); text-transform: uppercase; }.join-form button { font-size: var(--text-small); }
@media (max-width: $compact) { .setup-layout { gap: 34px; }.hero-monkey { width: 160px; }.hero-bug { width: 158px; }.orbit { width: 280px; }.orbit-two { width: 240px; }.mini-board { width: 136px; height: 129px; bottom: 22px; }.speech { font-size: var(--text-caption); }.club-stamp { right: 0; width: 90px; height: 90px; }.welcome-foot { font-size: var(--text-caption); } }
@media (max-width: $mobile) { .setup-layout { grid-template-columns: 1fr; padding-top: 30px; gap: 26px; }.welcome { text-align: center; }.edition { justify-content: center; margin-bottom: 15px; }.edition .eyebrow { font-size: var(--text-caption); }h1 { font-size: 42px; }.intro { font-size: var(--text-label); margin-top: 15px; }.illustration { height: 240px; width: min(400px, 100%); margin: 10px auto 0; }.hero-monkey { top: 30px; left: 0; }.hero-bug { top: 25px; }.mini-board { bottom: 0; }.club-stamp { bottom: 0; }.welcome-foot { display: none; }.setup-card { padding: 24px; }.orbit { max-width: 80%; }.speech-monkey { top: 9px; } }
@media (max-width: $mobile) {
  .mode-tabs button { flex-direction: column; gap: 4px; white-space: nowrap; }
  .mode-tabs svg { flex-shrink: 0; }
  .settings-row { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .undo-info { gap: 4px; }
  .undo-info strong { min-height: 28px; }
}
.timeout-note { margin-top: 14px; font-size: var(--text-caption); line-height: 1.7; color: var(--muted); }
</style>
