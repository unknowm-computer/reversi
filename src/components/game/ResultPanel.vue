<script setup lang="ts">
import { computed } from 'vue';
import type { Character, GameState } from '../../../shared/game/types';
import { characterName, otherCharacter } from '../../../shared/game/types';
import { score } from '../../../shared/game/rules';
import CharacterArt from './CharacterArt.vue';
interface Props { game: GameState; blackCharacter: Character; canUndo: boolean; online: boolean; requested: boolean; busy: boolean }
const props = defineProps<Props>();
const emit = defineEmits<{ (event: 'rematch'): void; (event: 'home'): void; (event: 'undo'): void }>();
const counts = computed(() => score(props.game.board));
const winnerCharacter = computed(() => props.game.result?.winner === 'black' ? props.blackCharacter : otherCharacter(props.blackCharacter));
const decisive = computed(() => props.game.result?.reason === 'noLegalMoves' && Math.abs(counts.value.black - counts.value.white) >= 20);
const reason = computed(() => ({ noLegalMoves: '모든 수를 마쳤어요', resign: '기권으로 대국이 끝났어요', timeout: '제한 시간이 다 되었어요', disconnect: '상대의 연결이 종료되었어요' })[props.game.result?.reason ?? 'noLegalMoves']);
</script>
<template><section class="result-panel" aria-label="대국 결과"><p class="eyebrow">A GOOD GAME, WELL PLAYED</p><div class="result-faces" :class="{ draw: !game.result?.winner }"><div class="result-face"><CharacterArt :character="game.result?.winner ? winnerCharacter : blackCharacter" :mood="game.result?.winner ? 'win' : 'idle'" :toast="Boolean(game.result?.winner) && winnerCharacter === 'jannabi'" portrait still /></div><div v-if="!game.result?.winner" class="result-face"><CharacterArt :character="otherCharacter(blackCharacter)" portrait still /></div></div><h2>{{ !game.result?.winner ? '사이좋게 무승부!' : `${characterName(winnerCharacter)}의 ${decisive ? '대승' : '승리'}!` }}</h2><p class="result-reason">{{ reason }} · 흑 {{ counts.black }} : 백 {{ counts.white }}</p><div class="result-buttons"><button class="primary" :disabled="requested || busy" @click="emit('rematch')">{{ requested ? '상대의 동의를 기다리는 중' : '한 판 더 하기' }}</button><button v-if="canUndo" class="secondary" @click="emit('undo')">마지막 수 무르기</button><button class="text-button" @click="emit('home')">처음으로 돌아가기</button></div><p v-if="online" class="online-note">두 사람이 모두 동의하면 새 대국이 시작돼요.</p></section></template>
<style scoped lang="scss">
.result-panel { text-align: center; }.eyebrow { color: var(--muted); font-size: var(--text-caption); }.result-faces { display: flex; justify-content: center; gap: 12px; margin: 20px auto; }.result-face { width: 180px; height: 180px; border-radius: 50%; background: #eef1e0; overflow: hidden; }.draw .result-face { width: 130px; height: 130px; }h2 { font-size: 28px; letter-spacing: -.04em; margin: 18px 0 10px; }.result-reason { color: var(--muted); font-size: var(--text-small); }.result-buttons { display: flex; flex-direction: column; gap: 10px; align-items: stretch; margin-top: 24px; }.result-buttons .text-button { justify-content: center; }.online-note { font-size: var(--text-caption); color: var(--muted); }
</style>
