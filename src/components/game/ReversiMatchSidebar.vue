<script setup lang="ts">
import { computed } from 'vue';
import type { Score } from '../../../shared/game/types';
import { REVERSI_CELL_COUNT } from '../../../shared/games/reversi/board';
import AppIcon from '../common/AppIcon.vue';

interface Props {
  counts: Score;
}

const props = defineProps<Props>();
const percentBlack = computed<number>(() => props.counts.black / (REVERSI_CELL_COUNT - props.counts.empty) * 100);
</script>

<template>
  <aside class="match-sidebar">
    <div class="match-card">
      <p class="eyebrow muted">ON THE BOARD</p>
      <h2>지금, 보드 위에는</h2>
      <div class="score-summary">
        <div><span class="summary-stone black" />흑<strong>{{ counts.black }}</strong></div>
        <span class="score-colon">:</span>
        <div><strong>{{ counts.white }}</strong>백<span class="summary-stone white" /></div>
      </div>
      <div class="score-bar"><span :style="{ width: `${percentBlack}%` }" /></div>
      <p class="empty-count">빈칸 <strong>{{ counts.empty }}</strong>개 · 아직 기회는 있어요</p>
    </div>
    <div class="tip-card">
      <span class="tip-icon"><AppIcon name="leaf" /></span>
      <p class="eyebrow">A LITTLE TIP</p>
      <h3>{{ counts.empty <= 10 ? '마지막 한 수까지' : '모서리를 눈여겨보세요' }}</h3>
      <p>{{ counts.empty <= 10 ? '이제 얼마 남지 않았어요. 마지막에 더 많은 돌을 가진 쪽이 승리해요.' : '한번 차지한 모서리의 돌은 뒤집히지 않아요. 든든한 내 편이 되어줄 거예요.' }}</p>
    </div>
  </aside>
</template>

<style scoped lang="scss">
@use '../../styles/tokens' as *;

.match-sidebar { margin-top: 28px; }
.match-card { padding: 22px 18px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); }
.match-card .eyebrow { font-size: var(--text-micro); }
.match-card h2 { font-size: var(--text-body); margin-top: 13px; letter-spacing: -.04em; }
.score-summary { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin: 26px 0 20px; }
.score-summary > div { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; font-size: var(--text-caption); }
.score-summary strong { font-family: ui-monospace, monospace; font-size: 27px; font-weight: 500; }
.summary-stone { width: 12px; height: 12px; border-radius: 50%; }
.summary-stone.black { background: #293d2e; }
.summary-stone.white { background: #eeebdf; border: 1px solid #c6cbbb; }
.score-colon { color: var(--muted); }
.score-bar { height: 5px; background: #e4e5d8; border-radius: 4px; overflow: hidden; }
.score-bar span { height: 100%; background: var(--green); display: block; transition: width .4s; }
.empty-count { color: var(--muted); font-size: var(--text-caption); margin-top: 14px; text-align: center; }
.empty-count strong { color: var(--ink); }
.tip-card { position: relative; padding: 25px 18px; margin-top: 18px; border-radius: 16px; background: #eaeedc; }
.tip-card .eyebrow { font-size: var(--text-micro); color: var(--muted); margin-top: 10px; }
.tip-icon { color: #889e6b; }
.tip-card h3 { font-size: var(--text-label); margin: 16px 0 10px; }
.tip-card > p:last-child { font-size: var(--text-small); line-height: 1.9; color: var(--muted); }

@media (max-width: $compact) {
  .match-sidebar { display: none; }
}
</style>
