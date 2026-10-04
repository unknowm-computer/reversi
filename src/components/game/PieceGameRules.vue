<script setup lang="ts">
interface Props { gameType: 'chess' | 'janggi' }
defineProps<Props>();
</script>

<template>
  <div class="piece-rules">
    <template v-if="gameType === 'chess'">
      <p>백이 먼저 시작해요. 상대 킹이 공격을 피할 수 없는 체크메이트를 만들면 승리해요.</p>
      <ol>
        <li><strong>기물을 고르고, 갈 곳을 선택해요.</strong><span>룩은 가로·세로, 비숍은 대각선, 퀸은 두 방향 모두 원하는 만큼 움직여요. 나이트는 ㄱ자 모양으로 뛰고 다른 기물을 넘을 수 있어요. 킹은 주위 한 칸씩 움직여요.</span></li>
        <li><strong>폰은 앞으로, 잡을 때는 대각선으로.</strong><span>앞으로 한 칸, 처음에는 두 칸도 갈 수 있어요. 상대 기물은 앞으로 대각선 한 칸에서 잡아요. 반대편 끝에 도착하면 퀸·룩·비숍·나이트 중 하나로 승격해요.</span></li>
        <li><strong>체크에는 반드시 대응해야 해요.</strong><span>내 킹이 공격받게 두거나, 킹을 공격받는 칸으로 움직일 수 없어요. 상대 킹을 직접 잡는 대신 체크메이트로 끝나요.</span></li>
        <li><strong>캐슬링과 앙파상도 가능해요.</strong><span>킹과 룩이 아직 움직이지 않았고 사이가 비어 있으며 킹이 체크 상태가 아니고 지나갈 칸도 안전하면, 킹을 룩 쪽으로 두 칸 옮겨 캐슬링해요. 상대 폰이 바로 직전에 두 칸 전진해 내 폰 옆에 왔다면, 한 칸 전진한 것처럼 대각선 뒤의 빈칸으로 잡을 수 있어요.</span></li>
        <li><strong>무승부로 끝나는 경우도 있어요.</strong><span>체크가 아닌데 합법적인 수가 없으면 스테일메이트예요. 기물 부족, 같은 국면 세 번, 양쪽이 50수씩 폰 이동이나 잡기 없이 진행한 경우에도 이 게임에서는 자동으로 무승부 처리해요.</span></li>
      </ol>
    </template>
    <template v-else>
      <p>초(파랑)가 먼저 시작해요. 상대 궁이 장군에서 벗어날 수 없는 외통장군을 만들면 승리해요.</p>
      <ol>
        <li><strong>상과 마의 배치를 골라요.</strong><span>대국 시작 전 설정 팝업에서 초와 한의 포진을 각각 고를 수 있어요. 왼쪽·오른쪽은 각 플레이어가 자기 진영에서 바라보는 방향이에요. 온라인에서는 방을 만든 사람이 정한 포진을 함께 사용해요.</span></li>
        <li><strong>차·포와 궁성의 대각선.</strong><span>차는 가로·세로로 움직이고 궁성 안에서는 대각선도 따라가요. 포는 기물 하나를 넘어야 움직이거나 잡을 수 있어요. 포를 넘거나 상대 포를 잡을 수 없어요. 궁성 대각선에서도 같은 규칙이에요.</span></li>
        <li><strong>마와 상은 길이 막히면 못 가요.</strong><span>마는 직선 한 칸 후 대각선 한 칸, 상은 직선 한 칸 후 대각선 두 칸으로 가요. 지나가는 길에 기물이 있으면 움직이지 못해요.</span></li>
        <li><strong>궁·사·졸(병)의 움직임.</strong><span>궁과 사는 자기 궁성의 선을 따라 한 칸 움직여요. 졸·병은 앞으로 또는 옆으로 한 칸 가고, 상대 궁성에서는 선을 따라 앞으로 대각선 이동도 가능해요. 뒤로는 갈 수 없어요.</span></li>
        <li><strong>장군과 한 수 쉼.</strong><span>내 궁이 공격받는 수는 둘 수 없고, 장군에는 반드시 대응해야 해요. 장군이 아닐 때는 내 차례에 프로필 영역의 쉬기 버튼으로 차례를 넘길 수 있어요.</span></li>
        <li><strong>빅장과 친선 무승부 규칙.</strong><span>두 궁이 같은 세로줄에서 마주 보면 빅장이에요. 상대는 사이를 막거나 궁을 옮겨 해소할 수 있고, 장군이 아니라면 빅장 수락으로 무승부를 선택할 수 있어요. 서로 연속해서 한 수씩 쉬면 자동 무승부예요. 중간에 기물을 움직이면 쉬기 횟수는 초기화돼요. 같은 국면이 세 번 나와도 무승부예요. 이 앱은 대회 점수제·덤 대신 이 친선 규칙을 사용해요.</span></li>
      </ol>
    </template>
  </div>
</template>

<style scoped lang="scss">
p { color: var(--muted); line-height: 1.8; }
ol { padding-left: 23px; margin: var(--space-6) 0; }
li { padding-left: 6px; margin: var(--space-4) 0; }
li span { display: block; color: var(--muted); font-size: var(--text-small); margin-top: var(--space-1); line-height: 1.8; }
</style>
