<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import AppIcon from '../common/AppIcon.vue';
import { gameName, type GameType } from '../../../shared/game/types';
interface Props { gameType?: GameType }
const props = withDefaults(defineProps<Props>(), { gameType: 'reversi' });
const emit = defineEmits<{ (event: 'close'): void }>();
const selectedGame = ref<GameType>(props.gameType);
const games: readonly GameType[] = ['reversi', 'gomoku'];
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
      <p v-if="selectedGame === 'gomoku'">가로, 세로, 대각선으로 내 돌 다섯 개를 나란히 연결해 보세요.</p>
      <p v-else>상대 돌을 내 돌 사이에 끼우면 내 색으로 뒤집을 수 있어요.</p>
      <ol v-if="selectedGame === 'gomoku'">
        <li><strong>흑돌이 먼저 시작해요.</strong><span>15×15 오목판에서 번갈아 한 알씩 놓아요.</span></li>
        <li><strong>선이 만나는 교차점에 놓아요.</strong><span>돌이 없는 교차점 중 금수가 아닌 곳에 놓을 수 있어요. 놓인 돌은 움직이거나 뒤집히지 않아요.</span></li>
        <li><strong>정확히 다섯 개를 연결하면 승리!</strong><span>가로, 세로, 대각선 중 한 방향으로 이어지면 돼요. 완성된 줄은 금색으로 표시해요. 오목을 완성하는 수는 3-3·4-4보다 우선해요.</span></li>
        <li><strong>흑·백 모두 3-3·4-4 금수예요.</strong><span>한 수로 두 방향 이상에 열린 3을 동시에 만들거나, 다음 한 수로 오목을 만들 수 있는 4를 둘 이상 만들 수 없어요. 열린 3은 돌 하나를 더 놓아 양 끝이 열린 4를 만들 수 있는 모양이에요.</span></li>
        <li><strong>여섯 개 이상은 장목 금수예요.</strong><span>흑·백 모두 여섯 개 이상 이어지는 수는 놓을 수 없어요. 다른 방향에서 오목을 동시에 완성하더라도 장목이면 금수예요. 승리한 사람 없이 판이 꽉 차면 무승부예요. 빈자리가 남아도 내 차례에 금수로 놓을 곳이 없으면 패배하고, 양쪽 모두 금수로 놓을 곳이 없으면 무승부예요.</span></li>
      </ol>
      <ol v-else>
        <li><strong>흑돌이 먼저 시작해요.</strong><span>초록 점으로 표시된 칸에 돌을 놓으세요.</span></li>
        <li><strong>가로, 세로, 대각선 모두 가능해요.</strong><span>하나 이상의 상대 돌을 사이에 끼워야 해요.</span></li>
        <li><strong>놓을 곳이 없으면 한 번 쉬어요.</strong><span>양쪽 모두 놓을 곳이 없으면 대국이 끝나요.</span></li>
        <li><strong>마지막에 돌이 더 많으면 승리!</strong><span>같은 개수면 사이좋게 무승부예요.</span></li>
      </ol>
      <section aria-labelledby="board-help-title">
        <h3 id="board-help-title">화면 읽기</h3>
        <p class="help-item"><span class="turn-example"><AppIcon name="turn" /></span>프로필의 초록색 화살표가 현재 차례를 알려줘요.</p>
        <p v-if="selectedGame === 'reversi'" class="help-item"><i class="legend-dot legal" />초록 점은 놓을 수 있는 곳이에요.</p>
        <p v-else class="help-item"><span class="forbidden-example" aria-hidden="true">×</span>붉은 ×는 현재 차례의 3-3·4-4·장목 금수예요. 그곳에는 놓을 수 없어요.</p>
        <p class="help-item"><i class="legend-dot last" />금색 점은 마지막으로 놓은 돌이에요.</p>
        <p v-if="selectedGame === 'gomoku'">프로필에는 돌 색과 착수 횟수, 남은 시간이 표시돼요. 착수 횟수는 승점이 아니에요. 조작 버튼은 내가 조작할 수 있는 플레이어의 차례에만 나타나요.</p>
        <p v-else>프로필에는 돌 색과 개수, 남은 시간이 표시돼요. 조작 버튼은 내가 조작할 수 있는 플레이어의 차례에만 나타나요.</p>
      </section>
      <section aria-labelledby="input-help-title">
        <h3 id="input-help-title">돌 놓기</h3>
        <p><strong>마우스·터치</strong> {{ selectedGame === 'gomoku' ? '빈 교차점을 클릭하거나 터치하세요.' : '놓을 수 있는 칸을 클릭하거나 터치하세요.' }}</p>
        <p><strong>키보드</strong> 방향키로 이동하고 Enter 또는 Space로 놓으세요.</p>
        <p><strong>조이패드</strong> 연결 후 버튼을 한 번 눌렀다 떼면 인식돼요. 십자키·왼쪽 스틱으로 이동하고 아래쪽 버튼(Xbox A / PlayStation ×)으로 놓으세요. 노란 테두리가 선택한 {{ selectedGame === 'gomoku' ? '교차점' : '칸' }}이에요.</p>
        <p>표준 버튼 배치를 지원하는 패드가 필요해요. 연결되지 않으면 키보드·마우스·터치를 사용할 수 있어요. 설정과 팝업은 마우스·터치·키보드로 조작하세요.</p>
      </section>
      <section aria-labelledby="hint-help-title">
        <h3 id="hint-help-title">혼자 놀기 힌트</h3>
        <p>혼자 놀기는 원하는 캐릭터와 1~5단계 난이도를 고를 수 있어요. 선택한 캐릭터가 흑돌로 먼저 시작하고, 다른 캐릭터가 AI를 맡아요.</p>
        <p>내 차례에 프로필의 전구 모양 힌트 버튼을 누르면 추천 {{ selectedGame === 'gomoku' ? '교차점' : '칸' }}에 금색 전구가 나타나요. 횟수 제한 없이 사용할 수 있으며, 돌은 직접 놓으세요. 힌트를 보는 동안에도 제한 시간은 계속 흘러요.</p>
        <p>게임이 끝나면 상단의 처음으로 옆에 다시하기가 나타나요. 같은 게임과 설정으로 바로 새 판을 시작하며, 온라인은 두 사람 모두 동의해야 시작돼요.</p>
      </section>
      <section aria-labelledby="undo-help-title">
        <h3 id="undo-help-title">무르기와 기권</h3>
        <p>한 수 무르기 버튼의 괄호는 남은 횟수예요. ∞는 무제한, 0은 사용할 수 없다는 뜻이에요.</p>
        <p>혼자 놀기·함께 놀기는 내 직전 수와 그 뒤 상대가 둔 수를 함께 되돌려요. 혼자 놀기의 무르기는 횟수 제한이 없어요. 함께 놀기에서는 설정한 내 무르기 횟수를 사용하며, 온라인에서는 사용할 수 없어요.</p>
        <p>기권하기를 누르면 확인 후 내 패배로 대국이 끝나요. 일반 종료 후에는 결과 화면에서 마지막 수를 무를 수 있지만, 기권·시간 초과·온라인 대전은 되돌릴 수 없어요.</p>
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
    </div>
    <button class="primary" @click="emit('close')">좋아요, 이해했어요<AppIcon name="arrow" /></button>
  </div>
</template>
<style scoped lang="scss">
.rules-tabs { display: flex; gap: var(--space-1); padding: var(--space-1); margin-bottom: var(--space-6); border-radius: 12px; background: var(--paper); }
.rules-tabs button { flex: 1; padding: var(--space-3) var(--space-4); border-radius: 9px; font-size: var(--text-label); font-weight: 600; color: var(--muted); }
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
</style>
