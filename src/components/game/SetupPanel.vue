<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { AI_DIFFICULTIES, DEFAULT_SETTINGS, type GameSettings, type GameType, type Mode, otherCharacter, characterName } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
import AppIcon from '../common/AppIcon.vue';
interface Props { connected: boolean; busy: boolean; error: string }
defineProps<Props>();
const emit = defineEmits<{
  (event: 'start', settings: GameSettings): void;
  (event: 'online'): void;
  (event: 'create', settings: GameSettings): void;
  (event: 'join', settings: GameSettings, code: string): void;
  (event: 'gameType', gameType: GameType): void;
}>();
const config = reactive<GameSettings>({ ...DEFAULT_SETTINGS });
const selectedGame = computed<GameType>(() => config.gameType ?? 'reversi');
const gameName = computed<string>(() => selectedGame.value === 'gomoku' ? '오목' : '리버시');
const games: { value: GameType; label: string; description: string }[] = [
  { value: 'reversi', label: '리버시', description: '뒤집는 재미, 마지막까지' },
  { value: 'gomoku', label: '오목', description: '다섯 알을 나란히' },
];
const modeSeconds: Record<Mode, GameSettings['seconds']> = { ai: 30, local: 30, online: 30 };
const code = ref('');
const modes: { value: Mode; label: string; icon: 'spark' | 'users' | 'globe' }[] = [{ value: 'ai', label: '혼자 놀기', icon: 'spark' }, { value: 'local', label: '함께 놀기', icon: 'users' }, { value: 'online', label: '온라인', icon: 'globe' }];
watch(selectedGame, gameType => emit('gameType', gameType), { immediate: true });
watch(() => config.mode, (mode, previous) => {
  modeSeconds[previous] = config.seconds;
  config.seconds = modeSeconds[mode];
  if (mode === 'online') emit('online');
});
</script>
<template>
  <div class="setup-layout">
    <section class="welcome">
      <div class="edition"><span class="tiny-disc" /><span class="eyebrow">A LITTLE RIVALRY, A LITTLE JOY</span></div>
      <h1>한 수의 여유,<br>한 판의 <span>즐거움.</span></h1>
      <p class="intro">꾀 많은 잔나비와 느긋한 베짱이.<br>작은 보드 위에서 펼쳐지는 유쾌한 두뇌 싸움!</p>
      <div class="illustration" :aria-label="`${gameName} 보드를 사이에 두고 만난 잔나비와 베짱이`" role="img">
        <div class="orbit orbit-one" /><div class="orbit orbit-two" />
        <span class="speech speech-monkey">이번엔 내가 이길걸?</span>
        <span class="speech speech-bug">한 수만 더 생각해 볼까 ♪</span>
        <div class="hero-monkey"><CharacterArt character="jannabi" /></div>
        <div class="hero-bug"><CharacterArt character="grasshopper" /></div>
        <div v-if="selectedGame === 'reversi'" class="mini-board" aria-hidden="true"><div v-for="n in 36" :key="n" class="mini-cell"><span v-if="[9,15,16,21,22,28].includes(n)" :class="n % 3 === 0 ? 'mini-black' : 'mini-white'" /></div></div>
        <div v-else class="mini-board mini-gomoku" aria-hidden="true">
          <svg viewBox="0 0 100 100"><path v-for="n in 7" :key="n" :d="`M ${n * 12 + 2} 14 V 86 M 14 ${n * 12 + 2} H 86`" /><circle v-for="n in 4" :key="`black-${n}`" :cx="n * 12 + 14" :cy="n * 12 + 14" r="5.4" class="preview-black" /><circle v-for="n in 3" :key="`white-${n}`" :cx="n * 12 + 26" cy="38" r="5.4" class="preview-white" /></svg>
        </div>
        <span class="hero-spark spark-a">✦</span><span class="hero-spark spark-b">✧</span>
        <div class="club-stamp">THE LITTLE<br><strong>{{ selectedGame === 'gomoku' ? 'GOMOKU' : 'REVERSI' }}</strong><br>CLUB · EST. 2026</div>
      </div>
      <div class="welcome-foot"><span>{{ selectedGame === 'gomoku' ? '02 — 다섯 알에 담긴 한 수의 즐거움' : '01 — 64개의 칸, 무한한 가능성' }}</span><span>천천히, 즐겁게.</span></div>
    </section>
    <section class="setup-card" aria-labelledby="setup-title">
      <div class="card-heading"><div><p class="eyebrow muted">LET'S PLAY</p><h2 id="setup-title">오늘의 한 판</h2></div><span class="card-leaf"><AppIcon name="leaf" /></span></div>
      <div class="mode-tabs" role="group" aria-label="대전 모드"><button v-for="mode in modes" :key="mode.value" :aria-pressed="config.mode === mode.value" :class="{ selected: config.mode === mode.value }" @click="config.mode = mode.value"><AppIcon :name="mode.icon" />{{ mode.label }}</button></div>
      <div class="mode-description"><span class="status-dot" />{{ config.mode === 'ai' ? `${characterName(otherCharacter(config.blackCharacter))}와 가볍게 실력을 겨뤄보세요.` : config.mode === 'local' ? '한 기기에서 번갈아 돌을 놓아보세요.' : '친구에게 방 코드를 보내 함께 즐겨보세요.' }}</div>
      <div class="field-heading"><h3>{{ config.mode === 'ai' ? '오늘의 플레이어' : '선공 캐릭터 선택' }}</h3><span>흑돌이 먼저 시작해요</span></div>
      <div class="character-picker" role="group" aria-label="선공 캐릭터">
        <button v-for="character in ['grasshopper', 'jannabi'] as const" :key="character" class="character-option" :class="{ chosen: config.blackCharacter === character }" :aria-pressed="config.blackCharacter === character" @click="config.blackCharacter = character">
          <span class="character-check">{{ config.blackCharacter === character ? '✓' : '' }}</span>
          <div class="picker-art"><CharacterArt :character="character" /></div><strong>{{ characterName(character) }}</strong><span>{{ character === 'grasshopper' ? '느긋한 전략가' : '장난꾸러기 승부사' }}</span>
        </button>
      </div>
      <div class="game-picker" role="group" aria-label="게임 선택">
        <button v-for="game in games" :key="game.value" class="game-option" :class="{ selected: selectedGame === game.value }" :aria-pressed="selectedGame === game.value" @click="config.gameType = game.value">
          <svg class="game-preview" :class="game.value" viewBox="0 0 60 60" aria-hidden="true">
            <rect x="1" y="1" width="58" height="58" rx="7" />
            <template v-if="game.value === 'reversi'"><path d="M20 5V55 M40 5V55 M5 20H55 M5 40H55" /><circle cx="20" cy="20" r="7" class="preview-black" /><circle cx="40" cy="20" r="7" class="preview-white" /><circle cx="20" cy="40" r="7" class="preview-white" /><circle cx="40" cy="40" r="7" class="preview-black" /></template>
            <template v-else><path d="M10 10H50 M10 20H50 M10 30H50 M10 40H50 M10 50H50 M10 10V50 M20 10V50 M30 10V50 M40 10V50 M50 10V50" /><circle v-for="n in 3" :key="n" :cx="n * 10 + 10" :cy="n * 10 + 10" r="4.7" class="preview-black" /><circle cx="30" cy="20" r="4.7" class="preview-white" /><circle cx="40" cy="30" r="4.7" class="preview-white" /></template>
          </svg>
          <span class="game-caption"><strong>{{ game.label }}</strong><span>{{ game.description }}</span></span>
          <span class="game-check" aria-hidden="true">{{ selectedGame === game.value ? '✓' : '' }}</span>
        </button>
      </div>
      <div class="settings-row">
        <label v-if="config.mode === 'ai'"><span>AI 난이도</span><select v-model="config.aiDifficulty"><option v-for="level in AI_DIFFICULTIES" :key="level.value" :value="level.value">{{ level.value }}단계 · {{ level.label }}</option></select></label>
        <label><span>한 수 제한 시간</span><select v-model="config.seconds"><option :value="0">시간 제한 없음</option><option :value="30">30초 · 가볍게</option><option :value="60">60초 · 여유롭게</option></select></label>
        <label v-if="config.mode === 'local'"><span>무르기 기회</span><select v-model="config.undoLimit"><option :value="1">인당 1회</option><option :value="3">인당 3회</option><option :value="-1">무제한</option><option :value="0">사용 안 함</option></select></label>
      </div>
      <template v-if="config.mode === 'online'">
        <button class="primary start-button" :disabled="!connected || busy" @click="emit('create', { ...config })">{{ connected ? '새로운 방 만들기' : '서버에 연결 중…' }}<AppIcon name="arrow" /></button>
        <form class="join-form" @submit.prevent="emit('join', { ...config }, code)"><label class="sr-only" for="room-code">친구의 방 코드</label><input id="room-code" v-model="code" placeholder="친구의 방 코드 6자리" maxlength="6" pattern="[A-Za-z2-9]{6}" required autocomplete="off" /><button class="secondary" :disabled="!connected || busy">입장</button></form>
      </template>
      <button v-else class="primary start-button" @click="emit('start', { ...config })">한 판 시작하기<AppIcon name="arrow" /></button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
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
.mini-gomoku { display: block; background: #e4bf80; border-color: #b6874e; box-shadow: -2px 6px 0 #966b3d, 0 12px 20px #63472922; }
.mini-gomoku svg { width: 100%; height: 100%; }.mini-gomoku path { stroke: #976f40; stroke-width: .7; fill: none; }
.preview-black { fill: #26382d; }.preview-white { fill: #fcf5df; stroke: #c9bfa3; stroke-width: .7; }
.hero-spark { position: absolute; color: #b0b984; font-size: 24px; }.spark-a { left: 47%; top: 40px; }.spark-b { right: 5%; bottom: 19px; }
.club-stamp { position: absolute; right: 7%; bottom: -5px; width: 100px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #acb699; border-radius: 50%; color: var(--text-accent); font-size: var(--text-micro); letter-spacing: .02em; transform: rotate(13deg); line-height: 1.1; }.club-stamp strong { font-size: var(--text-small); }
.welcome-foot { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 21px; border-top: 1px solid var(--line); color: var(--muted); font-size: var(--text-small); }
.setup-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 30px; box-shadow: 0 8px 24px #343f2510; }
.card-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }h2 { font-size: 26px; margin-top: 9px; letter-spacing: -.04em; }
.card-leaf { width: 46px; height: 46px; display: grid; place-items: center; background: #edf0e2; border-radius: 50%; color: #75916b; }.card-leaf svg { width: 24px; height: 24px; }
.game-picker { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin: var(--space-4) 0 var(--space-6); }
.game-option { position: relative; display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--line); border-radius: 13px; text-align: left; }
.game-option.selected { background: #f0f3e5; border-color: #819566; box-shadow: inset 0 0 0 1px #819566; }
.game-preview { width: 44px; height: 44px; flex-shrink: 0; }.game-preview rect { fill: #55795b; }.game-preview path { stroke: #35593f; stroke-width: .8; fill: none; }.game-preview.gomoku rect { fill: #e4bf80; }.game-preview.gomoku path { stroke: #976f40; }
.game-caption { display: flex; flex-direction: column; gap: 3px; }.game-caption strong { font-size: var(--text-body); }.game-caption > span { font-size: var(--text-caption); line-height: 1.4; color: var(--muted); }
.game-check { position: absolute; top: 3px; right: 6px; font-size: var(--text-caption); color: var(--text-accent); }
.mode-tabs { display: flex; padding: 5px; border-radius: 12px; background: #eeeee5; gap: 3px; }.mode-tabs button { flex: 1; font-size: var(--text-small); font-weight: 600; padding: 11px 2px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 9px; color: var(--muted); }.mode-tabs svg { width: 15px; height: 15px; }.mode-tabs button.selected { background: var(--card); color: var(--ink); box-shadow: 0 2px 5px #29372912; }
.mode-description { display: flex; line-height: 1.6; align-items: center; gap: 7px; font-size: var(--text-small); color: var(--muted); padding: var(--space-3) 0 var(--space-4); }.status-dot { width: 5px; height: 5px; border-radius: 50%; background: #91a371; }
.field-heading { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; margin-bottom: 13px; }h3 { font-size: var(--text-label); }.field-heading > span { color: var(--muted); font-size: var(--text-caption); }
.character-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.character-option { position: relative; display: flex; flex-direction: column; align-items: center; border: 1px solid var(--line); border-radius: 13px; padding: 7px 6px 14px; }.character-option.chosen { border-color: #819566; background: #f0f3e5; box-shadow: inset 0 0 0 1px #819566; }.character-option:disabled { opacity: .85; }.picker-art { width: 91px; height: 91px; }.character-option strong { font-size: var(--text-body); margin-top: 2px; }.character-option > span:last-child { font-size: var(--text-caption); color: var(--muted); margin-top: 4px; }.character-check { position: absolute; top: 11px; right: 11px; width: 20px; height: 20px; border: 1px solid #c8cfbb; border-radius: 50%; font-size: var(--text-caption); }.chosen .character-check { background: #78935f; border-color: #78935f; color: white; }
.settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border-top: 1px solid var(--line); padding-top: 20px; }.settings-row label { display: flex; flex-direction: column; gap: 9px; font-size: var(--text-small); }.settings-row > label:only-child { grid-column: 1 / -1; }.settings-row select { width: 100%; padding: 8px 10px; min-height: 40px; font-size: var(--text-small); background: #f6f5ee; }
.start-button { width: 100%; margin-top: 25px; font-size: var(--text-body); justify-content: space-between; }.error { color: var(--danger); font-size: var(--text-small); margin-top: 12px; line-height: 1.5; }.join-form { display: flex; gap: 8px; margin-top: 12px; }.join-form input { min-width: 0; flex: 1; font-size: var(--text-small); text-transform: uppercase; }.join-form button { font-size: var(--text-small); }
@media (max-width: $compact) { .setup-layout { gap: 34px; }.hero-monkey { width: 160px; }.hero-bug { width: 158px; }.orbit { width: 280px; }.orbit-two { width: 240px; }.mini-board { width: 136px; height: 129px; bottom: 22px; }.speech { font-size: var(--text-caption); }.club-stamp { right: 0; width: 90px; height: 90px; }.welcome-foot { font-size: var(--text-caption); } }
@media (max-width: $mobile) { .setup-layout { grid-template-columns: 1fr; padding-top: 30px; gap: 26px; }.welcome { text-align: center; }.edition { justify-content: center; margin-bottom: 15px; }.edition .eyebrow { font-size: var(--text-caption); }h1 { font-size: 42px; }.intro { font-size: var(--text-label); margin-top: 15px; }.illustration { height: 240px; width: min(400px, 100%); margin: 10px auto 0; }.hero-monkey { top: 30px; left: 0; }.hero-bug { top: 25px; }.mini-board { bottom: 0; }.club-stamp { bottom: 0; }.welcome-foot { display: none; }.setup-card { padding: 24px; }.orbit { max-width: 80%; }.speech-monkey { top: 9px; } }
@media (max-width: $mobile) {
  .game-option { flex-direction: column; text-align: center; padding: var(--space-3) var(--space-2); }
  .mode-tabs button { flex-direction: column; gap: 4px; white-space: nowrap; }
  .mode-tabs svg { flex-shrink: 0; }
  .settings-row { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
