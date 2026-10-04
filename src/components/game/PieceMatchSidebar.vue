<script setup lang="ts">
import { computed } from 'vue';
import type { Color, GameState, Piece } from '../../../shared/game/types';
import { sideName } from '../../../shared/game/types';
import AppIcon from '../common/AppIcon.vue';
import PieceArt from './PieceArt.vue';

interface Props { state: GameState }
const props = defineProps<Props>();
const sides: Color[] = ['black', 'white'];
const status = computed<string>(() => props.state.result ? props.state.result.winner ? `${sideName(props.state.gameType, props.state.result.winner)}의 승리` : '무승부' : `${sideName(props.state.gameType, props.state.turn)}의 차례`);
const moveCount = computed<number>(() => Math.max(0, (props.state.chess?.positionHistory.length ?? props.state.janggi?.positionHistory.length ?? 1) - 1));
const checkMessage = computed<string>(() => props.state.check && !props.state.result ? `${sideName(props.state.gameType, props.state.check)} ${props.state.gameType === 'janggi' ? '장군' : '체크'}` : '');
function count(color: Color): number { return props.state.pieces?.filter(piece => piece?.color === color).length ?? 0; }
function emblem(color: Color): Piece { return { color, kind: props.state.gameType === 'janggi' ? 'general' : 'king' }; }
</script>

<template>
  <div class="piece-match-sidebar">
    <div class="match-card">
      <p class="eyebrow muted">{{ state.gameType === 'janggi' ? 'JANGGI CLUB' : 'CHESS CLUB' }}</p>
      <h2>{{ status }}</h2>
      <p v-if="checkMessage" class="check-notice">{{ checkMessage }}</p>
      <p v-else-if="state.janggi?.bikjang && !state.result" class="bikjang-notice">빅장 · 응수하거나 무승부를 수락해요</p>
      <div class="piece-counts"><div v-for="side in sides" :key="side" class="piece-count"><PieceArt :piece="emblem(side)" :game-type="state.gameType" /><span>{{ sideName(state.gameType, side) }}</span><strong>{{ count(side) }}<small>개</small></strong></div></div>
      <p class="move-count">지금까지 <strong>{{ moveCount }}</strong>수 <span>· 남은 기물</span></p>
    </div>
    <div class="tip-card">
      <AppIcon name="leaf" /><p class="eyebrow">A LITTLE TIP</p>
      <h3>{{ state.gameType === 'janggi' ? '궁을 지키며 한 수씩' : '함께 움직이면 든든해요' }}</h3>
      <p>{{ state.gameType === 'janggi' ? '마와 상의 길을 열고, 포를 넘길 기물도 살펴보세요.' : '기물끼리 지켜주며 중앙을 차지해 보세요. 왕의 안전도 잊지 마세요.' }}</p>
      <p v-if="state.gameType === 'janggi'" class="draw-note">친선 규칙 · 빅장 수락이나 같은 국면 3회 반복, 서로 연속해서 한 수씩 쉬면 무승부예요.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.match-card { padding: 22px 18px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); }
.eyebrow { font-size: var(--text-micro); }.match-card h2 { margin-top: var(--space-3); font-size: var(--text-body); }
.check-notice, .bikjang-notice { margin-top: var(--space-2); font-size: var(--text-small); color: var(--danger); }.bikjang-notice { color: var(--text-accent); }
.piece-counts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin-top: var(--space-6); }
.piece-count { display: grid; grid-template-columns: 34px 1fr; align-items: center; column-gap: var(--space-2); font-size: var(--text-small); }
.piece-count .piece-art { width: 34px; height: 38px; grid-row: span 2; }.piece-count > span { color: var(--muted); }.piece-count strong { font-family: ui-monospace, monospace; font-size: 21px; line-height: 1.2; }
.piece-count small { margin-left: var(--space-1); font-size: var(--text-caption); font-weight: 400; }
.move-count { margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--line); font-size: var(--text-small); color: var(--muted); }.move-count strong { color: var(--ink); }.move-count span { font-size: var(--text-caption); }
.tip-card { margin-top: 18px; padding: 25px 18px; border-radius: 16px; background: #eaeedc; }.tip-card > svg { color: #889e6b; }.tip-card .eyebrow { margin-top: var(--space-2); color: var(--muted); }
.tip-card h3 { margin: var(--space-4) 0 var(--space-2); font-size: var(--text-label); }.tip-card > p:not(.eyebrow) { font-size: var(--text-small); line-height: 1.8; color: var(--muted); }
.tip-card .draw-note { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid #cad3b6; font-size: var(--text-caption); }
</style>
