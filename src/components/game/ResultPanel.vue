<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Character, GameState } from '../../../shared/game/types';
import { characterName, otherCharacter } from '../../../shared/game/types';
import { score } from '../../../shared/game/rules';
import CharacterArt from './CharacterArt.vue';
interface Props { game: GameState; blackCharacter: Character; canUndo: boolean; online: boolean; requested: boolean; busy: boolean }
const props = defineProps<Props>();
const emit = defineEmits<{ (event: 'rematch'): void; (event: 'home'): void; (event: 'undo'): void }>();
const skipped = ref(false);
const counts = computed(() => score(props.game.board));
const winnerCharacter = computed(() => props.game.result?.winner === 'black' ? props.blackCharacter : otherCharacter(props.blackCharacter));
const decisive = computed(() => props.game.result?.reason === 'noLegalMoves' && Math.abs(counts.value.black - counts.value.white) >= 20);
const reason = computed(() => ({ noLegalMoves: '모든 수를 마쳤어요', resign: '기권으로 대국이 끝났어요', timeout: '제한 시간이 다 되었어요', disconnect: '상대의 연결이 종료되었어요' })[props.game.result?.reason ?? 'noLegalMoves']);
</script>
<template><section class="result-panel" aria-label="대국 결과"><p class="eyebrow">A GOOD GAME, WELL PLAYED</p><div v-if="!skipped" class="ending" :class="{ decisive, draw: !game.result?.winner }"><div class="ending-winner"><CharacterArt :character="game.result?.winner ? winnerCharacter : blackCharacter" :mood="game.result?.winner ? 'win' : 'draw'" /></div><div class="ending-loser"><CharacterArt :character="game.result?.winner ? otherCharacter(winnerCharacter) : otherCharacter(blackCharacter)" :mood="game.result?.winner ? 'lose' : 'draw'" /></div><button class="skip" @click="skipped = true">연출 건너뛰기</button></div><h2>{{ !game.result?.winner ? '사이좋게 무승부!' : `${characterName(winnerCharacter)}의 ${decisive ? '대승' : '승리'}!` }}</h2><p class="result-reason">{{ reason }} · 흑 {{ counts.black }} : 백 {{ counts.white }}</p><div class="result-buttons"><button class="primary" :disabled="requested || busy" @click="emit('rematch')">{{ requested ? '상대의 동의를 기다리는 중' : '한 판 더 하기' }}</button><button v-if="canUndo" class="secondary" @click="emit('undo')">마지막 수 무르기</button><button class="text-button" @click="emit('home')">처음으로 돌아가기</button></div><p v-if="online" class="online-note">두 사람이 모두 동의하면 새 대국이 시작돼요.</p></section></template>
<style scoped lang="scss">
.result-panel { text-align: center; }.eyebrow { color: var(--muted); font-size: var(--text-caption); }.ending { height: 160px; position: relative; max-width: 300px; margin: 12px auto 22px; }.ending-winner, .ending-loser { position: absolute; width: 145px; height: 155px; }.ending-winner { left: 10px; z-index: 1; }.ending-loser { right: 5px; top: 12px; }.decisive .ending-loser { transform: rotate(68deg) translate(16px, 25px); }.decisive .ending-winner { left: 66px; top: -12px; }.draw .ending-loser { transform: scaleX(-1); right: 10px; }.skip { position: absolute; bottom: -18px; left: 0; right: 0; margin: auto; color: var(--muted); font-size: var(--text-caption); text-decoration: underline; }h2 { font-size: 28px; letter-spacing: -.04em; margin: 18px 0 10px; }.result-reason { color: var(--muted); font-size: var(--text-small); }.result-buttons { display: flex; flex-direction: column; gap: 10px; align-items: stretch; margin-top: 24px; }.result-buttons .text-button { justify-content: center; }.online-note { font-size: var(--text-caption); color: var(--muted); }
</style>
