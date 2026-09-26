<script setup lang="ts">
import GrasshopperHead from './GrasshopperHead.vue';
import ViolinArt from './ViolinArt.vue';
</script>
<template>
  <g class="batter" stroke-linecap="round" stroke-linejoin="round">
    <g class="batter-turn">
      <g class="legs skin">
        <path d="M93 168q-19 9-29 29l-17 5q-8 2-6 7 2 6 15 1l21-7 29-24Z" />
        <path class="front-leg" d="m120 178 28 25 20 6q12 3 14-3 2-6-7-8l-16-4-25-26Z" />
      </g>
      <path d="M88 119q-26 1-27 28-1 27 31 31m40-59q26 1 27 28 1 27-31 31" fill="#c4d494" stroke="#6d854e" stroke-width="2.5" />
      <path d="M84 115c-10 14-15 32-11 48 4 18 18 29 37 29s33-11 37-29c4-16-1-34-11-48Z" fill="#9eb76c" stroke="#496341" stroke-width="3" />
      <ellipse cx="110" cy="155" rx="24" ry="29" fill="#d3dfa6" />
      <path d="M95 164q15 6 30 0m-26 11q11 4 22 0" fill="none" stroke="#b4c788" stroke-width="2" />
      <!-- Keep the raised instrument behind the face, like a bat over the shoulder. -->
      <g class="ready-pose"><ViolinArt grip="batting" transform="translate(73 105) rotate(-115)" /></g>
      <GrasshopperHead still />
      <path d="m110 125-15-7 1 13 14-4 14 4 1-13Z" fill="#d49a55" stroke="#936036" stroke-width="2" />
      <circle cx="110" cy="125" r="3.5" fill="#edbd77" />
      <g class="ready-pose">
        <path d="M142 132Q107 142 81 108 M80 133Q56 143 72 108" class="arm-outline" />
        <path d="M142 132Q107 142 81 108 M80 133Q56 143 72 108" class="arm-fill" />
        <ellipse cx="81" cy="108" rx="7" ry="8" class="hand" />
        <ellipse cx="71" cy="107" rx="7" ry="8" class="hand" />
      </g>
      <!-- Arms and violin form one fixed silhouette during the spin. -->
      <g class="swing-pose">
        <path d="M141 130Q171 151 158 127 M80 132Q109 149 147 128" class="arm-outline" />
        <path d="M141 130Q171 151 158 127 M80 132Q109 149 147 128" class="arm-fill" />
        <g transform="translate(151 128) rotate(-8)">
          <ViolinArt grip="batting" />
          <ellipse cx="7" cy="0" rx="7" ry="8" class="hand" />
          <ellipse cx="-5" cy="0" rx="7" ry="8" class="hand" />
        </g>
      </g>
    </g>
  </g>
</template>
<style scoped lang="scss">
.skin { fill: #aabc77; stroke: #496341; stroke-width: 3px; }
.arm-outline, .arm-fill { fill: none; }
.arm-outline { stroke: #496341; stroke-width: 12px; }
.arm-fill { stroke: #aabc77; stroke-width: 7px; }
.hand { fill: #c8d997; stroke: #496341; stroke-width: 2.5px; }
.batter { transform-origin: 110px 205px; animation: batting-bounce 3.2s both; }
.batter-turn { transform-origin: 110px 145px; animation: batting-turn 3.2s linear both; }
.front-leg { transform-origin: 127px 174px; animation: batting-step 3.2s both; }
.ready-pose { animation: batting-ready 3.2s step-end both; }
.swing-pose { animation: batting-swing 3.2s step-end both; }
@keyframes batting-bounce {
  0%, 10% { transform: none; }
  25%, 30% { transform: translate(-7px, 4px) rotate(-7deg) scaleY(.91); }
  40%, 44% { transform: translate(17px, -2px) rotate(4deg) scaleY(1.03); }
  55% { transform: translate(17px, -4px) rotate(9deg); }
  68% { transform: translate(12px, 0) rotate(-5deg); }
  80%, 100% { transform: translate(12px, 0); }
}
@keyframes batting-turn {
  0%, 30% { transform: perspective(600px) rotateY(0deg); }
  34% { transform: perspective(600px) rotateY(90deg); }
  40%, 44% { transform: perspective(600px) rotateY(360deg); }
  56% { transform: perspective(600px) rotateY(390deg); }
  70%, 100% { transform: perspective(600px) rotateY(360deg); }
}
@keyframes batting-step { 0%, 10%, 38%, 100% { transform: none; } 25%, 30% { transform: rotate(-22deg); } }
/* Swap only at the edge-on frame; the arms never stretch or pivot independently. */
@keyframes batting-ready { 0% { opacity: 1; } 34%, 100% { opacity: 0; } }
@keyframes batting-swing { 0% { opacity: 0; } 34%, 100% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .batter, .batter-turn, .front-leg, .ready-pose, .swing-pose { animation: none; }
  .swing-pose { opacity: 0; }
}
</style>
