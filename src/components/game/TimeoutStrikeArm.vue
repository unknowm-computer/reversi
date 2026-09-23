<script setup lang="ts">
import { computed } from 'vue';
import type { Character } from '../../../shared/game/types';
interface Props { character: Character }
const props = defineProps<Props>();
const upperLength = computed<number>(() => props.character === 'jannabi' ? 45 : 36);
const forearmLength = computed<number>(() => props.character === 'jannabi' ? 45 : 34);
</script>
<template>
  <g class="strike-arm" :class="character" transform="translate(144 125)" stroke-linecap="round" stroke-linejoin="round">
    <g class="upper-arm">
      <path :d="`M0 0H${upperLength}`" class="arm-outline" />
      <path :d="`M0 0H${upperLength}`" class="arm-fill" />
      <g :transform="`translate(${upperLength} 0)`">
        <g class="forearm">
          <path :d="`M0 0H${forearmLength}`" class="arm-outline" />
          <path :d="`M0 0H${forearmLength}`" class="arm-fill" />
          <g :transform="`translate(${forearmLength} 0)`">
            <g class="wrist">
              <g v-if="character === 'jannabi'" class="fist">
                <path d="M-13-5q0-8 8-8H7q8 0 8 8V6q0 8-8 8H-5q-8 0-8-8Z" fill="#efd6ac" stroke="#664832" stroke-width="2.5" />
                <path d="M-12-2h8q6 0 5 6l-6 2m5 2v5m6-5v5" fill="none" stroke="#987252" stroke-width="2" />
              </g>
              <g v-else class="tap-bow">
                <path d="M-8-3H102l2 6H-8Z" fill="#ead8a7" stroke="#6d5437" stroke-width="2.5" />
                <path d="M8 1H99" stroke="#fff5d8" stroke-width="1.5" />
                <path d="M-8 0H5" stroke="#6d5437" stroke-width="6" />
                <ellipse rx="7" ry="6" fill="#c8d997" stroke="#496341" stroke-width="2.5" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  </g>
</template>
<style scoped lang="scss">
.strike-arm { --arm-line: #664832; --arm-fill: #a8764e; --arm-width: 18px; }
.grasshopper { --arm-line: #496341; --arm-fill: #aabc77; --arm-width: 11px; }
.arm-outline, .arm-fill { fill: none; }
.arm-outline { stroke: var(--arm-line); stroke-width: var(--arm-width); }
.arm-fill { stroke: var(--arm-fill); stroke-width: calc(var(--arm-width) - 5px); }
.upper-arm, .forearm, .wrist { transform-origin: 0 0; animation: monkey-shoulder var(--penalty-duration, 2400ms) var(--penalty-delay, 0ms) both; }
.upper-arm { transform: rotate(0); }
.forearm { transform: rotate(-85deg); animation-name: monkey-elbow; }
.wrist { transform: rotate(85deg); animation-name: monkey-wrist; }
.grasshopper .upper-arm { transform: rotate(-15deg); animation-name: bug-shoulder; }
.grasshopper .forearm { transform: rotate(-75deg); animation-name: bug-elbow; }
.grasshopper .wrist { transform: rotate(55deg); animation-name: bug-wrist; }
/* Fixed-length bones: the elbow folds during the wind-up and opens only at contact. */
@keyframes monkey-shoulder {
  0%, 65%, 100% { transform: rotate(0); animation-timing-function: ease-in-out; }
  22% { transform: rotate(-70deg); animation-timing-function: cubic-bezier(.55, 0, .9, .45); }
  30% { transform: rotate(-73deg); animation-timing-function: ease-out; }
  37% { transform: rotate(-80deg); animation-timing-function: ease-in-out; }
  48% { transform: rotate(-35deg); }
}
@keyframes monkey-elbow {
  0%, 65%, 100% { transform: rotate(-85deg); animation-timing-function: ease-in-out; }
  22% { transform: rotate(-20deg); animation-timing-function: cubic-bezier(.55, 0, .9, .45); }
  30% { transform: rotate(45deg); animation-timing-function: ease-out; }
  37% { transform: rotate(0); animation-timing-function: ease-in-out; }
  48% { transform: rotate(-60deg); }
}
@keyframes monkey-wrist {
  0%, 65%, 100% { transform: rotate(85deg); }
  22% { transform: rotate(90deg); animation-timing-function: cubic-bezier(.55, 0, .9, .45); }
  30% { transform: rotate(28deg); animation-timing-function: ease-out; }
  37% { transform: rotate(80deg); }
  48% { transform: rotate(95deg); }
}
@keyframes bug-shoulder {
  0%, 65%, 100% { transform: rotate(-15deg); animation-timing-function: ease-in-out; }
  22% { transform: rotate(-30deg); animation-timing-function: cubic-bezier(.55, 0, .9, .45); }
  30% { transform: rotate(-85deg); animation-timing-function: ease-out; }
  37% { transform: rotate(-65deg); animation-timing-function: ease-in-out; }
  48% { transform: rotate(-25deg); }
}
@keyframes bug-elbow {
  0%, 65%, 100% { transform: rotate(-75deg); }
  22% { transform: rotate(-80deg); animation-timing-function: cubic-bezier(.55, 0, .9, .45); }
  30% { transform: rotate(20deg); animation-timing-function: ease-out; }
  37% { transform: rotate(-20deg); }
  48% { transform: rotate(-70deg); }
}
@keyframes bug-wrist {
  0%, 65%, 100% { transform: rotate(55deg); }
  22% { transform: rotate(25deg); animation-timing-function: cubic-bezier(.55, 0, .9, .45); }
  30% { transform: rotate(65deg); animation-timing-function: ease-out; }
  37% { transform: rotate(50deg); }
  48% { transform: rotate(55deg); }
}
@media (prefers-reduced-motion: reduce) {
  .upper-arm, .forearm, .wrist { animation: none; }
}
</style>
