<script setup lang="ts">
import type { Reaction } from '../../../shared/game/types';
interface Props { mood?: Reaction; still?: boolean; taunt?: boolean; pose?: 'normal' | 'plead' | 'consider' }
withDefaults(defineProps<Props>(), { mood: 'idle', still: false, taunt: false, pose: 'normal' });
</script>
<template>
  <g class="head" :class="[`face-${mood}`, { frozen: still || taunt }]">
    <g class="antennae"><path class="antenna" d="M88 55Q65 7 45 24m78 26q12-45 39-32" fill="none" stroke="#496341" stroke-width="4" stroke-linecap="round"/>
    <circle cx="44" cy="23" r="5" fill="#496341"/><circle cx="162" cy="18" r="5" fill="#496341"/></g>
    <path d="M59 76q-5-34 39-40 60-9 70 34 11 40-43 52-57 10-66-46" fill="#aabc77" stroke="#496341" stroke-width="3"/>
    <ellipse cx="89" cy="67" rx="16" ry="19" fill="#f6f2d5"/><ellipse cx="136" cy="65" rx="16" ry="19" fill="#f6f2d5"/>
    <g class="eyes"><ellipse cx="94" cy="71" rx="4.5" ry="6.5" fill="#304634"/><ellipse cx="140" cy="69" rx="4.5" ry="6.5" fill="#304634"/><g fill="#fffdf0"><circle cx="95" cy="69" r="1.5"/><circle cx="141" cy="67" r="1.5"/></g></g>
    <template v-if="!taunt">
    <g v-if="still && mood === 'win'" class="big-smile"><path d="M82 73q11-16 22 0m25-2q11-16 22 0" fill="none" stroke="#496341" stroke-width="4" stroke-linecap="round"/><path d="M94 96q21 38 43-5Z" fill="#654633" stroke="#496341" stroke-width="3"/><path d="M102 99q13 3 26-2" stroke="#fff8df" stroke-width="6"/></g>
    <path v-else-if="pose === 'plead'" d="M101 101q12-6 23 0" fill="none" stroke="#496341" stroke-width="3" stroke-linecap="round"/>
    <g v-else-if="mood === 'whistle'"><path d="M96 96q10 14 22 1" fill="none" stroke="#496341" stroke-width="3" stroke-linecap="round"/><ellipse cx="127" cy="97" rx="5" ry="4" fill="#496341"/><text class="whistle-note" x="159" y="75" fill="#496341" font-size="28">♪</text></g>
    <g v-else-if="mood === 'annoyed'"><path d="m82 58 18 4m28-2 17-5M101 104q13-7 26-2" fill="none" stroke="#496341" stroke-width="3" stroke-linecap="round" /></g>
    <path v-else-if="['sad','lose','urgent'].includes(mood)" d="M98 104q15-13 28-2" fill="none" stroke="#496341" stroke-width="3" stroke-linecap="round"/>
    <path v-else d="M96 96q17 17 35-3" fill="none" stroke="#496341" stroke-width="3" stroke-linecap="round"/>
    </template>
    <ellipse cx="77" cy="92" rx="9" ry="5" fill="#d6a184" opacity=".65"/><ellipse cx="148" cy="89" rx="9" ry="5" fill="#d6a184" opacity=".65"/>
    <path d="m80 45 10-4m38-4 12 4" stroke="#496341" stroke-width="3" stroke-linecap="round"/>
  </g>
</template>
<style scoped lang="scss">
.head { transform-origin: 110px 105px; }
.antennae { transform-origin: 110px 50px; animation: antenna-sway 3.6s ease-in-out infinite; }
.face-idle:not(.frozen) .eyes { transform-box: fill-box; transform-origin: center; animation: blink 5.6s 1.8s ease-in-out infinite; }
.face-sly .eyes { transform: scaleY(.6); transform-origin: 110px 82px; }
.face-annoyed .eyes { transform: scaleY(.55); transform-origin: center 78px; }
.frozen.face-win .eyes { display: none; }
.frozen .antennae { animation: none; }
.whistle-note { animation: whistle-note .7s ease-out infinite; }
.frozen .whistle-note { animation: none; }
@keyframes blink { 0%, 43%, 47%, 100% { transform: scaleY(1); } 45% { transform: scaleY(.12); } }
@keyframes antenna-sway { 50% { transform: rotate(3deg); } }
@keyframes whistle-note { from { opacity: .4; transform: translateY(5px); } to { opacity: 1; transform: translateY(-5px); } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
