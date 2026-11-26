<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import AppIcon from '../common/AppIcon.vue';
import { gameName, isPieceGame, type GameType } from '../../../shared/game/types';
import PieceGameRules from './PieceGameRules.vue';
interface Props { gameType?: GameType }
const props = withDefaults(defineProps<Props>(), { gameType: 'reversi' });
const emit = defineEmits<{ (event: 'close'): void }>();
const selectedGame = ref<GameType>(props.gameType);
const games: readonly GameType[] = ['reversi', 'gomoku', 'chess', 'janggi', 'checkers', 'battleship'];
const tabs = ref<HTMLElement | null>(null);
const id = useId();
watch(() => props.gameType, gameType => { selectedGame.value = gameType; });

function navigateTabs(event: KeyboardEvent, index: number): void {
  let next: number;
  if (event.key === 'ArrowRight') next = (index + 1) % games.length;
  else if (event.key === 'ArrowLeft') next = (index + games.length - 1) % games.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = games.length - 1;
  else return;
  event.preventDefault();
  selectedGame.value = games[next];
  tabs.value?.querySelector<HTMLButtonElement>(`[data-game="${games[next]}"]`)?.focus();
}
</script>
<template>
  <div class="rules-content">
    <div ref="tabs" class="rules-tabs" role="tablist" aria-label="게임 설명 선택">
      <button
        v-for="(game, index) in games"
        :id="`${id}-tab-${game}`"
        :key="game"
        type="button"
        role="tab"
        :data-game="game"
        :aria-selected="selectedGame === game"
        :aria-controls="`${id}-panel`"
        :tabindex="selectedGame === game ? 0 : -1"
        @click="selectedGame = game"
        @keydown="navigateTabs($event, index)"
      >{{ gameName(game) }}</button>
    </div>
    <div :id="`${id}-panel`" class="rules-panel" role="tabpanel" :aria-labelledby="`${id}-tab-${selectedGame}`" tabindex="0">
      <template v-if="selectedGame === 'battleship'">
        <p>혼자 놀기와 온라인 대전에서 상대의 함선 다섯 척을 먼저 격침하세요.</p>
        <ol>
          <li><strong>10×10 바다에 함대를 배치해요.</strong><span>3칸 함선 두 척 중 한 척은 잠수함이에요. 설정을 마치면 대국 보드에서 자동 배치를 확인할 수 있어요. 함선을 끌어서 옮기거나 짧게 눌러 회전하세요. 붉게 표시된 위치에서는 함선이 원래 자리에 남아요. 다섯 척이 준비되면 시작해요. 대국 중 대국 정보의 ‘내 함대’에서 배와 상대의 사격 기록을 볼 수 있어요.</span></li>
          <li><strong>한 차례에 한 발씩 쏴요.</strong><span>‘상대 해역’에서 미탐색 칸을 고르세요. 불꽃은 명중, 푸른 물결은 빗나감이에요. 명중해도 상대 차례로 넘어가요.</span></li>
          <li><strong>한 배의 모든 칸을 맞히면 격침이에요.</strong><span>격침된 배는 실제 위치에 붉은 선체로 나타나요. 상대의 마지막 배가 가라앉으면 승리해요.</span></li>
        </ol>
        <p>클릭·터치로 사격하거나 방향키로 이동한 뒤 Enter로 쏘세요. 조이패드는 십자키와 아래쪽 버튼을 사용해요.</p>
      </template>
      <template v-else-if="selectedGame === 'checkers'">
        <p>8×8 영미식 체커는 각자 12개의 말로 시작해요. 상대가 더 움직일 수 없으면 승리예요.</p>
        <ol>
          <li><strong>어두운 칸으로 전진해요.</strong><span>일반 말은 대각선 앞으로 한 칸 이동해요.</span></li>
          <li><strong>잡을 수 있으면 반드시 점프해요.</strong><span>상대 말 바로 너머의 빈칸을 선택하세요. 같은 말로 더 잡을 수 있으면 계속 뛰어요. 경로가 여럿이면 원하는 쪽을 고르세요.</span></li>
          <li><strong>끝줄에 닿으면 킹이 돼요.</strong><span>승격하면 그 차례가 끝나요. 킹은 다음 차례부터 앞뒤 대각선으로 이동하고 잡을 수 있어요.</span></li>
        </ol>
        <p>같은 차례와 배치가 세 번 반복되거나 양쪽이 각각 40수 동안 일반 말 이동과 포획 없이 두면 무승부예요.</p>
      </template>
      <template v-else>
      <p v-if="selectedGame === 'gomoku'">가로, 세로, 대각선으로 내 돌 다섯 개를 나란히 연결해 보세요.</p>
      <p v-else-if="selectedGame === 'reversi'">상대 돌을 내 돌 사이에 끼우면 내 색으로 뒤집을 수 있어요.</p>
      <PieceGameRules v-else :game-type="selectedGame === 'chess' ? 'chess' : 'janggi'" />
      <ol v-if="selectedGame === 'gomoku'">
        <li><strong>흑돌이 먼저 시작해요.</strong><span>15×15 오목판에서 번갈아 한 알씩 놓아요.</span></li>
        <li><strong>선이 만나는 교차점에 놓아요.</strong><span>돌이 없는 교차점 중 금수가 아닌 곳에 놓을 수 있어요. 놓인 돌은 움직이거나 뒤집히지 않아요.</span></li>
        <li><strong>정확히 다섯 개를 연결하면 승리!</strong><span>가로, 세로, 대각선 중 한 방향으로 이어지면 돼요. 완성된 줄은 금색으로 표시해요. 오목을 완성하는 수는 3-3·4-4보다 우선해요.</span></li>
        <li><strong>흑·백 모두 3-3·4-4 금수예요.</strong><span>한 수로 두 방향 이상에 열린 3을 동시에 만들거나, 다음 한 수로 오목을 만들 수 있는 4를 둘 이상 만들 수 없어요. 열린 3은 돌 하나를 더 놓아 양 끝이 열린 4를 만들 수 있는 모양이에요.</span></li>
        <li><strong>여섯 개 이상은 장목 금수예요.</strong><span>흑·백 모두 여섯 개 이상 이어지는 수는 놓을 수 없어요. 다른 방향에서 오목을 동시에 완성하더라도 장목이면 금수예요. 승리한 사람 없이 판이 꽉 차면 무승부예요. 빈자리가 남아도 내 차례에 금수로 놓을 곳이 없으면 패배하고, 양쪽 모두 금수로 놓을 곳이 없으면 무승부예요.</span></li>
      </ol>
      <ol v-else-if="selectedGame === 'reversi'">
        <li><strong>흑돌이 먼저 시작해요.</strong><span>초록 점으로 표시된 칸에 돌을 놓으세요.</span></li>
        <li><strong>가로, 세로, 대각선 모두 가능해요.</strong><span>하나 이상의 상대 돌을 사이에 끼워야 해요.</span></li>
        <li><strong>놓을 곳이 없으면 한 번 쉬어요.</strong><span>양쪽 모두 놓을 곳이 없으면 대국이 끝나요.</span></li>
        <li><strong>마지막에 돌이 더 많으면 승리!</strong><span>같은 개수면 사이좋게 무승부예요.</span></li>
      </ol>
      <section aria-labelledby="setup-help-title">
        <h3 id="setup-help-title">대국 준비</h3>
        <p>첫 화면에서 모드·게임·캐릭터를 고른 뒤 시작 버튼을 누르세요. 게임판 위에 열리는 설정 팝업에서 난이도·제한 시간·무르기 기회와 장기 포진을 정해요. 대국 시작을 눌러야 시간이 흐르고 수를 둘 수 있어요.</p>
        <p>온라인은 방을 만들 때 설정하고, 친구는 방 코드로 입장해 같은 설정으로 즐겨요. 선택한 설정은 다음에도 기억해요.</p>
      </section>
      <section aria-labelledby="board-help-title">
        <h3 id="board-help-title">화면 읽기</h3>
        <p class="help-item"><span class="turn-example"><AppIcon name="turn" /></span>프로필의 초록색 화살표가 현재 차례를 알려줘요.</p>
        <p v-if="selectedGame === 'reversi'" class="help-item"><i class="legend-dot legal" />초록 점은 놓을 수 있는 곳이에요.</p>
        <p v-else-if="selectedGame === 'gomoku'" class="help-item"><span class="forbidden-example" aria-hidden="true">×</span>붉은 ×는 현재 차례의 3-3·4-4·장목 금수예요. 그곳에는 놓을 수 없어요.</p>
        <p v-else class="help-item"><i class="legend-dot legal" />기물을 고르면 갈 수 있는 곳이 표시돼요. 체크·장군을 받은 왕은 붉게 표시해요.</p>
        <p v-if="!isPieceGame(selectedGame)" class="help-item"><i class="legend-dot last" />금색 점은 마지막으로 놓은 돌이에요.</p>
        <p v-else class="help-item"><i class="legend-dot last" />마지막 수의 출발지와 도착지가 강조돼요.</p>
        <p v-if="selectedGame === 'gomoku'">프로필에는 돌 색과 착수 횟수, 남은 시간이 표시돼요. 착수 횟수는 승점이 아니에요. 조작 버튼은 내가 조작할 수 있는 플레이어의 차례에만 나타나요.</p>
        <p v-else-if="isPieceGame(selectedGame)">프로필에는 진영과 남은 기물 수, 남은 시간이 표시돼요. 기물 수로 승패를 결정하지 않아요. 온라인에서 후공이면 내 진영이 아래에 오도록 보드가 돌아가요.</p>
        <p v-else>프로필에는 돌 색과 개수, 남은 시간이 표시돼요. 조작 버튼은 내가 조작할 수 있는 플레이어의 차례에만 나타나요.</p>
      </section>
      <section aria-labelledby="input-help-title">
        <h3 id="input-help-title">두는 방법</h3>
        <p><strong>마우스·터치</strong> {{ isPieceGame(selectedGame) ? '내 기물을 선택한 뒤 이동할 곳을 선택하세요. 다른 내 기물을 선택하면 선택을 바꿀 수 있어요.' : selectedGame === 'gomoku' ? '빈 교차점을 클릭하거나 터치하세요.' : '놓을 수 있는 칸을 클릭하거나 터치하세요.' }}</p>
        <p><strong>키보드</strong> 방향키로 이동하고 Enter 또는 Space로 놓으세요.</p>
        <p><strong>조이패드</strong> 연결 후 버튼을 한 번 눌렀다 떼면 인식돼요. 십자키·왼쪽 스틱으로 이동하고 아래쪽 버튼(Xbox A / PlayStation ×)으로 놓으세요. 노란 테두리가 선택한 {{ selectedGame === 'gomoku' ? '교차점' : '칸' }}이에요.</p>
        <p>표준 버튼 배치를 지원하는 패드가 필요해요. 연결되지 않으면 키보드·마우스·터치를 사용할 수 있어요. 설정과 팝업은 마우스·터치·키보드로 조작하세요.</p>
      </section>
      <section aria-labelledby="hint-help-title">
        <h3 id="hint-help-title">혼자 놀기 힌트</h3>
        <p>혼자 놀기는 원하는 캐릭터와 1~5단계 난이도를 고를 수 있어요. 선택한 캐릭터가 먼저 시작하고, 다른 캐릭터가 AI를 맡아요.</p>
        <p v-if="isPieceGame(selectedGame)">내 차례에 프로필의 전구 모양 힌트 버튼을 누르면 추천하는 기물과 이동할 곳을 알려줘요. 횟수 제한은 없으며 기물은 직접 옮기세요. 장기에서는 한 수 쉼을 추천할 수도 있어요.</p>
        <p v-else>내 차례에 프로필의 전구 모양 힌트 버튼을 누르면 추천 {{ selectedGame === 'gomoku' ? '교차점' : '칸' }}에 금색 전구가 나타나요. 횟수 제한 없이 사용할 수 있으며, 돌은 직접 놓으세요.</p>
        <p>힌트 버튼을 다시 누르면 숨기고, 한 번 더 누르면 다시 보여줘요. 계산 중에는 같은 버튼으로 취소할 수 있어요. 힌트를 보는 동안에도 제한 시간은 계속 흘러요.</p>
        <p>게임이 끝나면 상단의 처음으로 옆에 다시하기가 나타나요. 같은 게임과 설정으로 바로 새 판을 시작하며, 온라인은 두 사람 모두 동의해야 시작돼요.</p>
      </section>
      <section aria-labelledby="undo-help-title">
        <h3 id="undo-help-title">무르기와 기권</h3>
        <p>무르기 버튼의 괄호는 남은 횟수예요. ∞는 무제한, 0은 사용할 수 없다는 뜻이에요.</p>
        <p>혼자 놀기·함께 놀기는 내 직전 수와 그 뒤 상대가 둔 수를 함께 되돌려요. 혼자 놀기의 무르기는 횟수 제한이 없어요. 함께 놀기에서는 설정한 내 무르기 횟수를 사용하며, 온라인에서는 사용할 수 없어요.</p>
        <p>기권을 누르면 확인 후 내 패배로 대국이 끝나요. 일반 종료 후에는 결과 화면에서 마지막 수를 무를 수 있지만, 기권·시간 초과·온라인 대전은 되돌릴 수 없어요.</p>
      </section>
      <section aria-labelledby="timer-help-title">
        <h3 id="timer-help-title">제한 시간</h3>
        <p>기본 제한 시간은 한 수에 30초예요. 남은 10초부터 타이머가 빨간색으로 바뀌고 초마다 째깍 소리로 알려줘요. 0초가 되면 삑 소리를 한 번 내고, 봐주거나 게임을 끝낼지 물어봐요.</p>
        <p>혼자 놀기는 내가, 함께 놀기·온라인은 상대가 봐줄지 선택해요. 봐주면 꿀밤 후 같은 차례에서 시간을 새로 받으며, 선택 중에는 대국 시간이 멈춰요.</p>
        <p>온라인은 연결이 끊겨도 시간이 계속 흐르며, 30초 안에 다시 연결해야 해요.</p>
      </section>
      <section aria-labelledby="online-help-title">
        <h3 id="online-help-title">친구와 온라인으로</h3>
        <p>게임을 선택하고 온라인에서 방을 만든 뒤 6자리 방 코드를 친구에게 보내세요. 친구는 코드를 입력하면 방에서 정한 게임으로 입장해요. 두 사람 모두 준비하면 시작해요.</p>
      </section>
      </template>
    </div>
    <button class="primary" @click="emit('close')">좋아요, 이해했어요<AppIcon name="arrow" /></button>
  </div>
</template>
<style scoped lang="scss">
@use '../../styles/tokens' as *;
.rules-tabs { display: flex; gap: var(--space-1); padding: var(--space-1); margin-bottom: var(--space-6); border-radius: 12px; background: var(--paper); }
.rules-tabs button { flex: 1; padding: var(--space-3) var(--space-2); border-radius: 9px; font-size: var(--text-label); font-weight: 600; color: var(--muted); white-space: nowrap; }
.rules-tabs button[aria-selected='true'] { background: var(--green); color: var(--card); }
.rules-panel { border-radius: 4px; }
p { color: var(--muted); line-height: 1.8; }
ol { padding-left: 23px; margin: var(--space-6) 0; }
li { padding-left: 6px; margin: var(--space-4) 0; }
li span { display: block; color: var(--muted); font-size: var(--text-small); margin-top: var(--space-1); }
section { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--line); }
h3 { font-size: var(--text-body); margin-bottom: var(--space-3); }
section p { font-size: var(--text-small); margin-top: var(--space-2); }
.help-item { display: flex; align-items: center; gap: var(--space-2); }
.turn-example { display: grid; place-items: center; width: 22px; height: 22px; flex-shrink: 0; color: var(--card); background: var(--green); border-radius: 50%; }
.turn-example svg { width: 12px; height: 12px; fill: currentColor; }
.legend-dot { width: 6px; height: 6px; margin-inline: var(--space-2); border-radius: 50%; flex-shrink: 0; }
.legal { background: #9eb078; }
.last { background: #caa864; }
.forbidden-example { display: grid; place-items: center; width: 22px; height: 22px; flex-shrink: 0; border-radius: 50%; color: var(--danger); background: var(--danger-soft); font-weight: 700; }
.primary { width: 100%; margin-top: var(--space-6); font-size: var(--text-label); }
@media (max-width: $mobile) {
  .rules-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
