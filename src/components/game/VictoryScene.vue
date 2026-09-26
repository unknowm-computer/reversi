<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { characterName, otherCharacter, type Character } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
const BATTING_HIT_MS = 1280;
const VICTORY_DURATION_MS = 3200;
interface Props { winner?: Character }
const props = withDefaults(defineProps<Props>(), { winner: 'grasshopper' });
const emit = defineEmits<{ (event: 'done'): void; (event: 'hit'): void }>();
const dialog = ref<HTMLDialogElement | null>(null);
const hitTimers: number[] = [];
const hitCount = ref(0);
let endTimer: number | undefined;
let finished = false;
function finish(): void {
  if (finished) return;
  finished = true;
  hitTimers.forEach(window.clearTimeout); window.clearTimeout(endTimer);
  emit('done');
}
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
  dialog.value?.showModal();
  const hits = props.winner === 'jannabi' ? [960, 1280, 1600, 1920, 2240] : [BATTING_HIT_MS];
  hits.forEach(at => hitTimers.push(window.setTimeout(() => { hitCount.value++; emit('hit'); }, at)));
  endTimer = window.setTimeout(finish, VICTORY_DURATION_MS);
});
onUnmounted(() => { hitTimers.forEach(window.clearTimeout); window.clearTimeout(endTimer); });
</script>
<template>
  <dialog ref="dialog" class="victory-scene" :aria-label="`${characterName(winner)} 승리 연출`" @cancel.prevent="finish">
    <div class="victory-stage" :class="{ lariat: winner === 'jannabi', batting: winner === 'grasshopper' }">
      <p class="victory-title">{{ winner === 'jannabi' ? '다섯 바퀴! 멈출 수 없는 잔나비!' : '한 바퀴 돌려, 바이올린 홈런!' }}</p>
      <div class="stage" role="img" :aria-label="winner === 'jannabi' ? '잔나비가 양팔을 옆으로 뻗고 다섯 바퀴 회전하며 베짱이를 연속으로 때리고 마지막 타격에 날려 보냅니다.' : '베짱이가 바이올린을 양손으로 잡고 몸을 한 바퀴 돌리며 크게 휘둘러 잔나비를 홈런처럼 날려 보냅니다.'">
        <div class="floor" />
        <div class="champion"><div class="fighter"><CharacterArt :character="winner" :swing="winner === 'grasshopper'" :lariat="winner === 'jannabi'" /></div></div>
        <div class="rival"><CharacterArt :character="otherCharacter(winner)" mood="sad" still /></div>
        <span class="swoosh" aria-hidden="true" />
        <span v-if="winner !== 'jannabi'" class="hit" aria-hidden="true">✦ 팡! ✧</span>
        <span v-else-if="hitCount" :key="hitCount" class="hit combo-hit" :class="{ finishing: hitCount === 5 }" aria-hidden="true">{{ hitCount === 5 ? '✦ 퍼엉! ✦' : `팡! ×${hitCount}` }}</span>
        <span class="farewell" aria-hidden="true">으아아~</span>
        <span class="music" aria-hidden="true">{{ winner === 'jannabi' ? '으하하!' : '♪ ♫' }}</span>
      </div>
      <strong class="victory-caption">{{ winner === 'jannabi' ? '잔나비의 더블 래리어트!' : '베짱이의 바이올린 홈런!' }}</strong>
      <button class="secondary" autofocus @click="finish">연출 건너뛰기</button>
    </div>
  </dialog>
</template>
<style scoped lang="scss">
.victory-scene { width: min(680px, calc(100% - 24px)); max-height: calc(100dvh - 24px); padding: 0; border: 1px solid var(--line); border-radius: 26px; background: var(--card); color: var(--ink); overflow: hidden; }
.victory-scene::backdrop { background: #142e3580; backdrop-filter: blur(5px); }
.victory-stage { padding: 24px 12px; text-align: center; background: radial-gradient(ellipse at 40% 60%, #fff9d9, var(--card) 70%); }
.victory-title { font-size: clamp(18px, 4vw, 26px); font-weight: 750; margin: 0; }
.stage { position: relative; width: 100%; aspect-ratio: 1.8; overflow: hidden; animation: camera-shake 3.2s both; }
.floor { position: absolute; bottom: 12%; left: 15%; width: 70%; height: 8%; border-radius: 50%; background: #28453512; }
.champion, .rival { position: absolute; width: 34%; bottom: 12%; }
.champion { left: 12%; z-index: 1; transform-origin: 50% 90%; }
.rival { left: 50%; transform-origin: center; animation: fly-away 3.2s both; }
.swoosh { position: absolute; left: 38%; top: 20%; width: 26%; height: 48%; border: 7px solid #dfb457; border-left-color: transparent; border-bottom-color: transparent; border-radius: 50%; transform: rotate(20deg); animation: hit-flash 3.2s both; }
.hit { position: absolute; left: 52%; top: 30%; color: #a76624; font-size: clamp(22px, 6vw, 46px); font-weight: 850; animation: hit-flash 3.2s both; }
.farewell { position: absolute; right: 5%; top: 8%; color: var(--muted); font-weight: 700; animation: cry-away 3.2s both; }
.music { position: absolute; left: 40%; top: 20%; color: #a76624; font-size: 38px; animation: finale 3.2s both; }
.victory-caption { display: block; margin: 0 0 18px; font-size: var(--text-body); }
.batting .champion { left: 14%; }
.batting .rival { left: 44%; }
.batting .swoosh { left: 26%; top: 48%; width: 46%; height: 12%; border-width: 5px; transform: rotate(-2deg); animation-name: batting-trail; }
.batting .hit { left: 54%; top: 45%; }
.lariat .champion { animation: lariat-charge 3.2s both; }
.lariat .fighter { transform-origin: 50% 55%; animation: lariat-spin 3.2s linear both; }
.lariat .rival { animation: combo-recoil 3.2s both; }
.lariat .stage { animation: combo-shake 3.2s both; }
.lariat .swoosh { left: 26%; top: 43%; width: 43%; height: 14%; border: 7px solid #dfb457; border-left-color: transparent; transform: rotate(-8deg); animation: spin-trail 3.2s both; }
.lariat .music { font-size: clamp(20px, 4vw, 32px); animation: combo-finale 3.2s both; }
.lariat .farewell { animation: combo-cry 3.2s both; }
.combo-hit { animation: combo-burst .24s ease-out both; }
.combo-hit.finishing { animation-duration: .45s; color: #b85c26; }
@keyframes lariat-charge { 0%, 10% { transform: none; } 18% { transform: translateX(-5%) scaleY(.9); } 29%, 70% { transform: translateX(48%) scale(1.08); } 85%, 100% { transform: translateX(18%); } }
@keyframes lariat-spin { 0%, 20% { transform: perspective(600px) rotateY(0deg); } 70%, 100% { transform: perspective(600px) rotateY(1800deg); } }
@keyframes spin-trail { 0%, 19%, 76%, 100% { opacity: 0; } 25%, 70% { opacity: .9; } }
@keyframes combo-recoil {
  0%, 29% { transform: none; }
  31%, 41%, 51%, 61% { transform: translate(12%, -3%) rotate(18deg) scaleY(.86); }
  38%, 48%, 58%, 69% { transform: translate(3%, 0) rotate(-5deg); }
  72% { transform: translate(18%, -10%) rotate(35deg) scaleY(.8); }
  84% { transform: translate(100%, -95%) rotate(260deg) scale(.65); opacity: 1; }
  94%, 100% { transform: translate(240%, -180%) rotate(540deg) scale(.2); opacity: 0; }
}
@keyframes combo-shake { 0%, 29%, 39%, 49%, 59%, 69%, 77%, 100% { transform: none; } 30%, 40%, 50%, 60% { transform: translateX(-4px); } 32%, 42%, 52%, 62% { transform: translateX(4px); } 70%, 74% { transform: translate(-7px, 3px); } 72% { transform: translate(7px, -3px); } }
@keyframes combo-burst { from { opacity: 1; transform: scale(.7) rotate(-8deg); } 35% { opacity: 1; transform: scale(1.2) rotate(5deg); } to { opacity: 0; transform: translateY(-12px) scale(1.3); } }
@keyframes combo-cry { 0%, 71%, 97%, 100% { opacity: 0; } 77%, 88% { opacity: 1; } }
@keyframes combo-finale { 0%, 87% { opacity: 0; } 94%, 100% { opacity: 1; } }
@keyframes fly-away { 0%, 40% { transform: none; animation-timing-function: ease-out; } 43% { transform: translate(8%, -3%) rotate(20deg) scaleY(.8); } 64% { transform: translate(95%, -95%) rotate(230deg) scale(.65); opacity: 1; } 80%, 100% { transform: translate(230%, -180%) rotate(540deg) scale(.2); opacity: 0; } }
@keyframes hit-flash { 0%, 39.9%, 56%, 100% { opacity: 0; } 40%, 45% { opacity: 1; } }
@keyframes batting-trail { 0%, 34%, 52%, 100% { opacity: 0; transform: rotate(-6deg) scaleX(.7); } 39%, 44% { opacity: .8; transform: rotate(-2deg) scaleX(1); } }
@keyframes cry-away { 0%, 45%, 80%, 100% { opacity: 0; } 53%, 67% { opacity: 1; } }
@keyframes finale { 0%, 69% { opacity: 0; transform: translateY(10px); } 85%, 100% { opacity: 1; transform: translateY(-5px); } }
@keyframes camera-shake { 0%, 39.9%, 49%, 100% { transform: none; } 40%, 44% { transform: translateX(-4px); } 42%, 46% { transform: translateX(4px); } }
@media (prefers-reduced-motion: reduce) { .stage, .champion, .rival, .swoosh, .hit, .farewell, .music, .lariat .fighter, .lariat .champion, .lariat .swoosh, .lariat .stage, .lariat .rival, .lariat .music, .lariat .farewell, .combo-hit { animation: none; } }
</style>
