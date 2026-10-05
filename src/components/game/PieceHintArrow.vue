<script setup lang="ts">
import { computed } from 'vue';
import { pieceHintArrowGeometry } from '../../utils/pieceHintArrow';

interface Props { from: number; to: number; columns: number; rows: number; reversed?: boolean }
const props = withDefaults(defineProps<Props>(), { reversed: false });
const geometry = computed(() => pieceHintArrowGeometry(props.from, props.to, props.columns, props.rows, props.reversed));
const points = computed<string>(() => geometry.value?.points.map(point => `${point.x},${point.y}`).join(' ') ?? '');
</script>

<template>
  <svg v-if="geometry" class="piece-hint-arrow" :viewBox="`0 0 ${columns} ${rows}`" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <polygon class="arrow-outline" :points="points" />
    <polygon class="arrow-fill" :points="points" />
  </svg>
</template>

<style scoped lang="scss">
.piece-hint-arrow { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; }
.piece-hint-arrow polygon { fill: #e6a519; stroke-linejoin: round; }
.arrow-outline { stroke: #684211; stroke-width: .075; }
.arrow-fill { stroke: #fff8df; stroke-width: .035; }
</style>
