<script setup lang="ts">
import { computed } from 'vue';
import type { Character } from '../../../shared/game/types';
interface Props { character: Character }
const props = defineProps<Props>();
const mouthY = computed<number>(() => props.character === 'jannabi' ? 102 : 95);
</script>
<template>
  <g class="character-taunt" :class="character" stroke-linecap="round" stroke-linejoin="round">
    <g class="cheek-arms">
      <path :d="`M84 131Q61 130 68 ${mouthY + 7}L76 ${mouthY + 2}M141 131Q166 132 159 ${mouthY + 7}L148 ${mouthY + 2}`" class="arm-outline" />
      <path :d="`M84 131Q61 130 68 ${mouthY + 7}L76 ${mouthY + 2}M141 131Q166 132 159 ${mouthY + 7}L148 ${mouthY + 2}`" class="arm-fill" />
    </g>
    <g :transform="`translate(0 ${mouthY - 102})`">
      <g class="wide-smile">
        <path d="M87 102q24 9 51-1-5 24-25 24-19 0-26-23Z" fill="#713f35" stroke="var(--taunt-line)" stroke-width="2.5" />
        <path d="M93 105q20 6 38-1l-3 6q-18 5-32 0Z" fill="#fff7df" />
      </g>
      <g class="tongue">
        <path d="M108 113q11 2 19-2l-4 16q-3 13-16 10-12-4-6-13Z" fill="#e79099" stroke="#a65360" stroke-width="2.5" />
        <path d="m116 118-4 11" fill="none" stroke="#c46577" stroke-width="2" />
        <path d="M105 131q3 4 8 2" fill="none" stroke="#f5b0b6" stroke-width="2.5" />
      </g>
      <g class="left-hand" fill="var(--taunt-hand)" stroke="var(--taunt-line)">
        <ellipse cx="74" cy="105" rx="8" ry="7" stroke-width="2.5" />
        <path d="m75 101 13 1" fill="none" stroke-width="8" />
        <path d="m75 101 13 1" fill="none" stroke="var(--taunt-hand)" stroke-width="4" />
        <path d="m70 106 5 3" fill="none" stroke-width="1.5" />
      </g>
      <g class="right-hand" fill="var(--taunt-hand)" stroke="var(--taunt-line)">
        <ellipse cx="151" cy="105" rx="8" ry="7" stroke-width="2.5" />
        <path d="m150 101-13 1" fill="none" stroke-width="8" />
        <path d="m150 101-13 1" fill="none" stroke="var(--taunt-hand)" stroke-width="4" />
        <path d="m155 106-5 3" fill="none" stroke-width="1.5" />
      </g>
    </g>
  </g>
</template>
<style scoped lang="scss">
.character-taunt { --taunt-line: #664832; --taunt-fur: #a8764e; --taunt-hand: #efd6ac; --arm-width: 16px; }
.grasshopper { --taunt-line: #496341; --taunt-fur: #aabc77; --taunt-hand: #c8d997; --arm-width: 11px; }
.arm-outline, .arm-fill { fill: none; }
.arm-outline { stroke: var(--taunt-line); stroke-width: var(--arm-width); }
.arm-fill { stroke: var(--taunt-fur); stroke-width: calc(var(--arm-width) - 5px); }
.tongue { transform-origin: 113px 113px; animation: tongue-out var(--taunt-duration, 1400ms) ease-in-out both; }
.wide-smile { transform-origin: 112px 103px; animation: cheeky-smile var(--taunt-duration, 1400ms) ease-in-out both; }
.left-hand { animation: pull-left var(--taunt-duration, 1400ms) ease-in-out both; }
.right-hand { animation: pull-right var(--taunt-duration, 1400ms) ease-in-out both; }
@keyframes tongue-out {
  0%, 10% { opacity: 0; transform: scaleY(.2); }
  26% { opacity: 1; transform: scaleY(1.05) rotate(-5deg); }
  46% { transform: rotate(5deg); }
  65%, 100% { opacity: 1; transform: rotate(-3deg); }
}
@keyframes cheeky-smile { 0%, 8% { transform: scaleX(.85); } 25%, 100% { transform: scaleX(1.05); } }
@keyframes pull-left { 0%, 8% { transform: translateX(3px); } 25%, 100% { transform: translateX(-1px); } }
@keyframes pull-right { 0%, 8% { transform: translateX(-3px); } 25%, 100% { transform: translateX(1px); } }
@media (prefers-reduced-motion: reduce) { .character-taunt * { animation: none; } }
</style>
