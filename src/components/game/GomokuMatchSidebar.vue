<script setup lang="ts">
import { computed } from 'vue';
import type { Color, GameResult } from '../../../shared/game/types';
import AppIcon from '../common/AppIcon.vue';

interface Props { moveCount: number; turn: Color; result: GameResult | null }
const props = defineProps<Props>();
const status = computed<string>(() => props.result ? (props.result.winner === null ? '무승부' : `${props.result.winner === 'black' ? '흑' : '백'}의 승리`) : `${props.turn === 'black' ? '흑' : '백'}의 차례`);
</script>

<template>
  <aside class="match-sidebar">
    <div class="match-card">
      <p class="eyebrow muted">FIVE IN A ROW</p>
      <h2>다섯 알을 나란히</h2>
      <div class="turn-summary"><span class="summary-stone" :class="result?.winner ?? turn" /><strong>{{ status }}</strong></div>
      <p class="move-count">지금까지 <strong>{{ moveCount }}</strong>수</p>
      <div class="line-example" aria-hidden="true"><i v-for="n in 5" :key="n" /></div>
      <p class="rule-note">가로 · 세로 · 대각선<br>정확히 다섯 개를 이으면 승리예요.</p>
      <p class="board-rule">15×15 · 흑·백 3-3·4-4·장목 금수<br>붉은 ×에는 놓을 수 없어요.</p>
    </div>
    <div class="tip-card">
      <span class="tip-icon"><AppIcon name="leaf" /></span>
      <p class="eyebrow">A LITTLE TIP</p>
      <h3>내 돌도, 상대 돌도</h3>
      <p>상대의 돌이 네 개 이어졌다면 먼저 막아보세요. 양쪽이 열린 줄을 만들면 다음 수를 준비하기 좋아요.</p>
    </div>
  </aside>
</template>

<style scoped lang="scss">
@use '../../styles/tokens' as *;
.match-sidebar { margin-top: 28px; }
.match-card { padding: 22px 18px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); }
.match-card .eyebrow { font-size: var(--text-micro); }
.match-card h2 { font-size: var(--text-body); margin-top: 13px; letter-spacing: -.04em; }
.turn-summary { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-6); }
.summary-stone { width: 17px; height: 17px; border-radius: 50%; flex-shrink: 0; }
.summary-stone.black { background: #293d2e; }.summary-stone.white { background: #eeebdf; border: 1px solid #c6cbbb; }
.move-count { margin-top: var(--space-2); color: var(--muted); font-size: var(--text-small); }
.move-count strong { color: var(--ink); font-family: ui-monospace, monospace; }
.line-example { position: relative; display: flex; justify-content: space-between; gap: var(--space-2); margin: var(--space-6) 0 var(--space-4); }
.line-example::before { position: absolute; content: ''; height: 2px; left: 0; right: 0; top: calc(50% - 1px); background: #c49a50; }
.line-example i { position: relative; width: 18px; height: 18px; border-radius: 50%; background: #293d2e; box-shadow: 0 0 0 2px #e0bf7b; }
.rule-note { font-size: var(--text-small); line-height: 1.8; color: var(--muted); }
.board-rule { padding-top: var(--space-3); margin-top: var(--space-3); border-top: 1px solid var(--line); color: var(--muted); font-size: var(--text-caption); line-height: 1.8; }
.tip-card { position: relative; padding: 25px 18px; margin-top: 18px; border-radius: 16px; background: #eaeedc; }
.tip-card .eyebrow { font-size: var(--text-micro); color: var(--muted); margin-top: 10px; }.tip-icon { color: #889e6b; }
.tip-card h3 { font-size: var(--text-label); margin: 16px 0 10px; }
.tip-card > p:last-child { font-size: var(--text-small); line-height: 1.9; color: var(--muted); }
@media (max-width: $compact) { .match-sidebar { display: none; } }
</style>
