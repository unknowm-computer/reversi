<script setup lang="ts">
import { computed } from 'vue';
import type { Character, GameState } from '../../../shared/game/types';
import { characterName, colorName, otherCharacter } from '../../../shared/game/types';
import { opposite, score } from '../../../shared/game/state';
import CharacterArt from './CharacterArt.vue';
interface Props { game: GameState; blackCharacter: Character; canUndo: boolean; online: boolean; requested: boolean; busy: boolean }
const props = defineProps<Props>();
const emit = defineEmits<{ (event: 'rematch'): void; (event: 'home'): void; (event: 'undo'): void }>();
const counts = computed(() => score(props.game.board));
const winnerCharacter = computed(() => props.game.result?.winner === 'black' ? props.blackCharacter : otherCharacter(props.blackCharacter));
const decisive = computed(() => props.game.gameType === 'reversi' && props.game.result?.reason === 'noLegalMoves' && Math.abs(counts.value.black - counts.value.white) >= 20);
const reason = computed<string>(() => {
  const result = props.game.result;
  if (props.game.gameType === 'gomoku' && result?.reason === 'noLegalMoves') {
    return result.winner
      ? `${colorName(opposite(result.winner))}돌이 금수로 놓을 곳이 없어 끝났어요`
      : '양쪽 모두 금수로 놓을 곳이 없어 무승부예요';
  }
  return ({
    noLegalMoves: '모든 수를 마쳤어요', fiveInRow: '다섯 돌을 이어 승리했어요', boardFull: '빈 교차점 없이 판을 채웠어요',
    resign: '기권으로 대국이 끝났어요', timeout: '제한 시간이 다 되었어요', disconnect: '상대의 연결이 종료되었어요',
    checkmate: props.game.gameType === 'chess' ? '체크메이트! 킹이 피할 곳이 없어요' : '외통장군! 궁을 지킬 수 없어요',
    stalemate: '체크가 아니지만 움직일 수 없어 무승부예요', repetition: '같은 국면이 세 번 나타나 무승부예요',
    fiftyMoves: '양쪽이 50수씩 폰 이동·잡기 없이 두어 무승부예요', insufficientMaterial: '체크메이트에 필요한 기물이 부족해요',
    bikjang: '빅장을 받아들여 무승부예요', mutualPass: '양쪽이 연속으로 한 수 쉬어 무승부예요',
  })[result?.reason ?? 'noLegalMoves'];
});
</script>
<template><section class="result-panel" aria-label="대국 결과"><p class="eyebrow">A GOOD GAME, WELL PLAYED</p><div class="result-faces" :class="{ draw: !game.result?.winner }"><div class="result-face"><CharacterArt :character="game.result?.winner ? winnerCharacter : blackCharacter" :mood="game.result?.winner ? 'win' : 'idle'" :toast="Boolean(game.result?.winner) && winnerCharacter === 'jannabi'" portrait still /></div><div v-if="!game.result?.winner" class="result-face"><CharacterArt :character="otherCharacter(blackCharacter)" portrait still /></div></div><h2>{{ !game.result?.winner ? '사이좋게 무승부!' : `${characterName(winnerCharacter)}의 ${decisive ? '대승' : '승리'}!` }}</h2><p class="result-reason">{{ reason }}<template v-if="game.gameType === 'gomoku'"> · {{ counts.black + counts.white }}수</template><template v-else-if="game.gameType === 'reversi'"> · 흑 {{ counts.black }} : 백 {{ counts.white }}</template></p><div class="result-buttons"><button class="primary" :disabled="requested || busy" @click="emit('rematch')">{{ requested ? '상대의 동의를 기다리는 중' : '한 판 더 하기' }}</button><button v-if="canUndo" class="secondary" @click="emit('undo')">마지막 수 무르기</button><button class="text-button" @click="emit('home')">처음으로 돌아가기</button></div><p v-if="online" class="online-note">두 사람이 동의하면 설정을 확인한 뒤 새 대국을 시작해요.</p></section></template>
<style scoped lang="scss">
.result-panel { text-align: center; }.eyebrow { color: var(--muted); font-size: var(--text-caption); }.result-faces { display: flex; justify-content: center; gap: 12px; margin: 20px auto; }.result-face { width: 180px; height: 180px; border-radius: 50%; background: #eef1e0; overflow: hidden; }.draw .result-face { width: 130px; height: 130px; }h2 { font-size: 28px; letter-spacing: -.04em; margin: 18px 0 10px; }.result-reason { color: var(--muted); font-size: var(--text-small); }.result-buttons { display: flex; flex-direction: column; gap: 10px; align-items: stretch; margin-top: 24px; }.result-buttons .text-button { justify-content: center; }.online-note { font-size: var(--text-caption); color: var(--muted); }
</style>
