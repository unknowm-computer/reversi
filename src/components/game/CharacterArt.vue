<script setup lang="ts">
import GrasshopperHead from './GrasshopperHead.vue';
import GrasshopperBattingRig from './GrasshopperBattingRig.vue';
import ViolinArt from './ViolinArt.vue';
import CharacterTaunt from './CharacterTaunt.vue';
import type { Character, Reaction } from '../../../shared/game/types';
interface Props { character: Character; mood?: Reaction; decorative?: boolean; portrait?: boolean; still?: boolean; swing?: boolean; lariat?: boolean; toast?: boolean; taunt?: boolean; pose?: 'normal' | 'plead' | 'consider' }
withDefaults(defineProps<Props>(), { mood: 'idle', decorative: true, portrait: false, still: false, swing: false, lariat: false, toast: false, taunt: false, pose: 'normal' });
</script>
<template>
  <svg class="character" :class="[character, `mood-${mood}`, `pose-${pose}`, { portrait, still, swing, lariat, taunt }]" :viewBox="portrait ? (character === 'jannabi' ? '26 0 168 168' : '33 0 148 148') : '0 0 220 230'" :aria-hidden="decorative" :role="decorative ? undefined : 'img'" :aria-label="decorative ? undefined : character === 'jannabi' ? '장난꾸러기 잔나비' : portrait ? '느긋한 베짱이' : '바이올린을 연주하는 베짱이'">
    <ellipse v-if="!portrait" cx="110" cy="210" rx="65" ry="9" fill="#203d2d" opacity=".1" />
    <g class="body">
      <g v-if="pose !== 'normal'" class="pose-limbs" stroke-linecap="round" stroke-linejoin="round">
        <template v-if="pose === 'plead'">
          <path d="M85 180q-27 6-28 20 2 12 34 9l19-12 19 12q34 3 34-9-2-15-29-20" class="pose-fur" stroke-width="4" />
          <path d="M87 135c-10 14-15 32-9 47 6 14 57 14 64-1 6-17-1-33-12-46Z" class="pose-fur" stroke-width="3" />
          <ellipse cx="110" cy="172" rx="22" ry="24" class="pose-belly" />
          <path d="M82 155q-14 30 15 24l13-17m29-7q14 30-16 24l-13-17" class="pose-arms" />
          <path d="M82 155q-14 30 15 24l13-17m29-7q14 30-16 24l-13-17" class="pose-arm-fill" />
          <g class="clasped-hands">
            <path d="M110 173q-24-7-13-22l9-14q4-3 4 4 0-7 4-4l9 14q11 15-13 22Z" class="pose-belly" stroke-width="3" />
            <path d="M110 141v29m-10-14 5 7m15-7-5 7" class="pose-lines" stroke-width="2" />
          </g>
          <path d="m69 202 18 1m48 0 18-1" class="pose-lines" stroke-width="3" />
        </template>
        <template v-else>
          <path d="M85 174q-7 10-11 21-12 0-13 8 0 8 17 7 14-1 18-12l9-18m16 0 7 18q4 11 18 12 17 1 17-7-1-8-13-8l-13-24" class="pose-fur" stroke-width="3" />
          <path d="M84 115c-10 15-14 32-10 49 5 20 21 28 37 28s33-10 37-28c3-18-3-35-14-49Z" class="pose-fur" stroke-width="3" />
          <ellipse cx="111" cy="153" rx="24" ry="27" class="pose-belly" />
          <g v-if="character === 'jannabi'">
          <path d="M80 132q-24 20 4 31l47-14m11-17q25 23-3 29l-46-12" class="pose-arms" />
          <path d="M80 132q-24 20 4 31l47-14m11-17q25 23-3 29l-46-12" class="pose-arm-fill" />
          <path d="m122 147 12-2q9 3 3 10l-13 3m-25-12-10-2q-9 3-3 10l11 3" class="pose-belly" stroke-width="3" />
          </g>
        </template>
      </g>
      <template v-if="character === 'jannabi'">
        <g class="normal-limbs" stroke-linecap="round" stroke-linejoin="round">
          <path class="tail" d="M143 166c34 27 65 6 58-16-5-17-28-19-31-5-2 9 8 13 14 8" fill="none" stroke="#946443" stroke-width="12" />
          <g fill="#a8764e" stroke="#664832" stroke-width="3">
            <path d="M84 171q-7 11-11 23-10 0-11 8-1 9 16 9 14 0 18-10l10-22Z" />
            <path d="M119 180l8 21q4 10 19 10 16 0 15-9-1-8-11-8l-11-24Z" />
            <path v-if="!lariat && !taunt" class="left-arm" d="M84 126c-19-4-30 12-35 29-5 13-1 21 8 21 8 0 11-6 13-14l21-17" />
            <g v-if="!lariat && !toast && !taunt" class="right-arm">
              <path d="M137 126c15 8 25 14 34 2l13-22c5-9 14-8 18-2 4 6 0 12-4 18l-15 24c-12 17-30 18-49 3" />
              <path d="M184 91q-5 22 15 28 12-20 1-41-1 23-16 13Z" fill="#f2ca60" stroke="#98722b" stroke-width="2.5" />
              <path d="M190 98q0 10 7 14" fill="none" stroke="#ffe397" stroke-width="3" />
            </g>
            <g v-if="lariat" class="lariat-arms">
              <path d="M83 124 23 122q-16-4-19 7-1 11 17 12l64 4Z" />
              <path d="m137 124 60-2q16-4 19 7 1 11-17 12l-62 4Z" />
            </g>
            <path d="M83 117c-9 13-13 27-10 43 3 21 17 31 38 31 22 0 37-12 39-33 2-16-3-29-13-41Z" />
          </g>
          <ellipse cx="111" cy="155" rx="25" ry="28" fill="#efd6ac" />
          <path d="M98 142q10-8 22-2" fill="none" stroke="#fae7c4" stroke-width="4" />
          <path d="m74 201 2-4m65 4-2-4" fill="none" stroke="#80593e" stroke-width="2" />
        </g>
        <g class="head">
          <circle cx="58" cy="78" r="24" fill="#a8764e" stroke="#664832" stroke-width="3"/><circle cx="161" cy="78" r="24" fill="#a8764e" stroke="#664832" stroke-width="3"/>
          <circle cx="58" cy="78" r="13" fill="#ddb48b"/><circle cx="161" cy="78" r="13" fill="#ddb48b"/>
          <path d="M65 100q-21-54 24-69 22-7 35 0 50 5 34 70-11 33-47 33T65 100" fill="#a8764e" stroke="#664832" stroke-width="3"/>
          <path d="M80 103q-18-43 6-46 15-4 24 10 8-15 26-10 20 8 6 45 16 21-30 23-45 0-32-22" fill="#f1d9b0"/>
          <path d="m99 33 2-16 12 15 12-12 2 15" fill="#a8764e" stroke="#664832" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <g class="eyes"><ellipse cx="92" cy="82" rx="4.5" ry="6.5" fill="#352f28"/><ellipse cx="129" cy="82" rx="4.5" ry="6.5" fill="#352f28"/><g fill="#fff8e8"><circle cx="93" cy="80" r="1.4"/><circle cx="130" cy="80" r="1.4"/></g></g>
          <template v-if="!taunt">
          <g v-if="still && mood === 'win'" class="big-smile"><path d="M82 83q10-15 20 0m17 0q10-15 20 0" fill="none" stroke="#664832" stroke-width="4" stroke-linecap="round"/><path d="M87 105q24 39 49-3Z" fill="#743f32" stroke="#664832" stroke-width="3"/><path d="M95 108q15 6 31-1" stroke="#fff8df" stroke-width="7"/></g>
          <path v-else-if="pose === 'plead'" d="M98 109q12-6 24 0" fill="none" stroke="#664832" stroke-width="3" stroke-linecap="round"/>
          <g v-else-if="mood === 'sly'" class="sly-face"><path d="m82 69 20 8m18 0 20-9" fill="none" stroke="#664832" stroke-width="5" stroke-linecap="round"/><path d="M87 103q25 32 50-7-28 15-50 7" fill="#fff8df" stroke="#664832" stroke-width="3"/><path d="m107 110 1 7m11-10 2 6" stroke="#664832" stroke-width="2"/></g>
          <g v-else-if="mood === 'annoyed'"><path d="m83 71 18 4m18 0 18-4M98 112q14-5 27-1" fill="none" stroke="#664832" stroke-width="3" stroke-linecap="round" /></g>
          <path v-else-if="['sad','lose','urgent'].includes(mood)" d="M94 113q17-18 33 0" fill="none" stroke="#664832" stroke-width="3" stroke-linecap="round"/>
          <path v-else d="M94 105q17 17 34-1" fill="#fff8df" stroke="#664832" stroke-width="3" stroke-linejoin="round"/>
          </template>
          <ellipse cx="110" cy="99" rx="7" ry="4" fill="#8e6249"/><ellipse cx="78" cy="99" rx="8" ry="6" fill="#db9b80" opacity=".7"/><ellipse cx="144" cy="99" rx="8" ry="6" fill="#db9b80" opacity=".7"/>
        </g>
        <g v-if="toast" class="beer-toast" stroke-linejoin="round">
          <path d="M141 145q21 11 21-17" fill="none" stroke="#664832" stroke-width="12" stroke-linecap="round"/>
          <path d="M141 145q21 11 21-17" fill="none" stroke="#a8764e" stroke-width="7" stroke-linecap="round"/>
          <path d="M163 112h11q10 1 8 14-1 9-17 8" fill="none" stroke="#88612f" stroke-width="5"/>
          <path d="M136 107h31l-2 38q-13 7-27-1Z" fill="#edb842" stroke="#88612f" stroke-width="3"/>
          <path d="m144 119 1 19m11-20-1 20" stroke="#ffdf79" stroke-width="4" stroke-linecap="round"/>
          <path d="M134 109q-5-11 5-14 5-8 13-2 13-6 16 4 10 5 2 14l-36-2Z" fill="#fff9e7" stroke="#d9c99f" stroke-width="2"/>
          <path d="M163 129q10-3 8 7-1 7-10 5" fill="#ddb48b" stroke="#664832" stroke-width="3"/>
        </g>
      </template>
      <template v-else>
        <GrasshopperBattingRig v-if="swing" />
        <template v-else>
          <g class="normal-limbs" stroke-linecap="round" stroke-linejoin="round">
            <g fill="#aabc77" stroke="#496341" stroke-width="3">
              <path d="M86 171q-11 9-18 24l-14 3q-9 2-7 8 2 6 14 3l17-5 24-24Z" />
              <path d="m123 180 19 23 18 6q12 3 14-3 2-6-7-8l-15-4-14-25Z" />
            </g>
            <path d="M88 119q-26 1-27 28-1 27 31 31m40-59q26 1 27 28 1 27-31 31" fill="#c4d494" stroke="#6d854e" stroke-width="2.5" />
            <path d="M84 115c-10 14-15 32-11 48 4 18 18 29 37 29s33-11 37-29c4-16-1-34-11-48Z" fill="#9eb76c" stroke="#496341" stroke-width="3" />
            <ellipse cx="110" cy="155" rx="24" ry="29" fill="#d3dfa6" />
            <path d="M95 164q15 6 30 0m-26 11q11 4 22 0" fill="none" stroke="#b4c788" stroke-width="2" />
          </g>
          <GrasshopperHead :mood="mood" :still="still" :taunt="taunt" :pose="pose" />
          <path v-if="taunt" d="M106 122q-7 29 31 61" fill="none" stroke="#936036" stroke-width="2.5" />
          <ViolinArt :transform="taunt ? 'translate(35 20) rotate(18 115 154) scale(.85)' : 'rotate(-25 115 154)'" />
          <g v-if="!taunt" class="playing-arms" stroke-linecap="round" stroke-linejoin="round">
            <path d="M77 132q-19 15-1 24l26-6" fill="none" stroke="#496341" stroke-width="12" />
            <path d="M77 132q-19 15-1 24l26-6" fill="none" stroke="#aabc77" stroke-width="7" />
            <ellipse cx="103" cy="149" rx="7" ry="6" fill="#c8d997" stroke="#496341" stroke-width="2.5" />
            <g class="bow-arm">
              <path d="M145 132q22 12 12 24l-13 6" fill="none" stroke="#496341" stroke-width="12" />
              <path d="M145 132q22 12 12 24l-13 6" fill="none" stroke="#aabc77" stroke-width="7" />
              <path d="m98 135 72 41" stroke="#6d5437" stroke-width="3.5" />
              <path d="m98 140 69 40" stroke="#ead8a7" stroke-width="1.5" />
              <ellipse cx="146" cy="163" rx="7" ry="6" fill="#c8d997" stroke="#496341" stroke-width="2.5" />
            </g>
          </g>
          <g class="bow-tie" stroke="#936036" stroke-width="2" stroke-linejoin="round">
            <path d="M110 123q-8-8-15-5l1 13q8 2 14-4 6 6 14 4l1-13q-7-3-15 5Z" fill="#d49a55" />
            <circle cx="110" cy="125" r="3.5" fill="#edbd77" />
          </g>
          <g v-if="pose === 'consider'" class="consider-instrument" stroke-linecap="round" stroke-linejoin="round">
            <ViolinArt transform="rotate(-20 115 154)" />
            <path d="M78 133q-16 17 0 25l26-7m40-16q21 8 16-10l-16-14" fill="none" stroke="#496341" stroke-width="12" />
            <path d="M78 133q-16 17 0 25l26-7m40-16q21 8 16-10l-16-14" fill="none" stroke="#aabc77" stroke-width="7" />
            <ellipse cx="104" cy="151" rx="7" ry="6" fill="#c8d997" stroke="#496341" stroke-width="2.5" />
            <ellipse cx="142" cy="111" rx="7" ry="6" fill="#c8d997" stroke="#496341" stroke-width="2.5" />
          </g>
        </template>
      </template>
      <CharacterTaunt v-if="taunt" :character="character" />
    </g>
    <g v-if="['happy','dance','win'].includes(mood)" fill="#c99a47" class="sparkles"><path d="m27 43 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm161 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></g>
    <g v-if="['urgent','sad'].includes(mood)" fill="#83b5bd"><path d="M177 66q-15 20 0 21 14-1 0-21"/><path d="M42 96q-10 15 0 16 10-1 0-16"/></g>
    <text v-if="mood === 'think'" x="180" y="42" fill="#738262" font-size="32" font-family="serif">?</text>
    <text v-if="mood === 'undo'" x="176" y="45" fill="#a97a45" font-size="22">…</text>
  </svg>
</template>
<style scoped lang="scss">
.character { width: 100%; height: 100%; overflow: visible; }
.character.jannabi { --pose-fur: #a8764e; --pose-line: #664832; --pose-belly: #f1d9b0; }
.character.grasshopper { --pose-fur: #92aa60; --pose-line: #496341; --pose-belly: #c8d59b; }
.pose-fur { fill: var(--pose-fur); stroke: var(--pose-line); }
.pose-belly { fill: var(--pose-belly); stroke: var(--pose-line); }
ellipse.pose-belly { stroke: none; }
.pose-arms { fill: none; stroke: var(--pose-line); stroke-width: 11px; }
.pose-arm-fill { fill: none; stroke: var(--pose-fur); stroke-width: 6px; }
.pose-lines { fill: none; stroke: var(--pose-line); }
.character:not(.pose-normal) .body > :not(.head):not(.pose-limbs):not(.consider-instrument) { display: none; }
.character:not(.pose-normal) .body { animation: none; transform: none; }
.pose-plead .head { animation: pleading 1.5s ease-in-out infinite; transform-origin: 110px 110px; }
.clasped-hands { animation: clasp 1.5s ease-in-out infinite; transform-origin: 110px 170px; }
.pose-consider .head { animation: considering 2.8s ease-in-out infinite; }
@keyframes pleading { 0%, 100% { transform: translateY(22px) scale(.88); } 50% { transform: translateY(29px) rotate(-5deg) scale(.88); } }
@keyframes clasp { 50% { transform: translateY(-3px) rotate(5deg); } }
@keyframes considering { 0%, 100% { transform: rotate(3deg); } 50% { transform: rotate(-7deg) translateY(-2px); } }
.still.mood-win .eyes { display: none; }
.lariat .body { animation: none; }
.swing .body { animation: none; }
.portrait .body { transform-origin: 110px 80px; }
.mood-sly .head { animation: chuckle .38s ease-in-out infinite alternate; }
.mood-sly .eyes { transform: scaleY(.6); transform-origin: 110px 82px; }
.mood-whistle .head { animation: ponder .8s ease-in-out infinite alternate; }
.whistle-note { animation: whistle-note .7s ease-out infinite; }
@keyframes chuckle { to { transform: translateY(2px) rotate(-2deg); } }
@keyframes whistle-note { from { opacity: .4; transform: translateY(5px); } to { opacity: 1; transform: translateY(-5px); } }
.body { transform-origin: 110px 195px; animation: breathe 4s ease-in-out infinite; }
.head { transform-origin: 110px 105px; }
.right-arm { transform-origin: 144px 128px; }
.mood-happy .body, .mood-dance .body, .mood-win .body { animation: celebrate .95s ease-in-out infinite alternate; }
.mood-win .right-arm, .mood-dance .right-arm { animation: wave .8s ease-in-out infinite alternate; }
.mood-think .head, .mood-undo .head { animation: ponder 1.4s ease-in-out infinite alternate; }
.mood-urgent .body { animation: tremble .15s linear infinite alternate; }
.mood-sad .head, .mood-lose .head { transform: rotate(12deg) translateY(9px); }
.mood-lose .body { transform: rotate(15deg) translateY(15px); animation: none; }
.mood-draw .body { transform: rotate(-8deg) translateY(12px); animation: breathe 5s infinite; }
.mood-annoyed .eyes { transform: scaleY(.55); transform-origin: center 78px; }
.mood-pass .body { animation: shrug 1s ease-in-out infinite alternate; }
@keyframes breathe { 50% { transform: translateY(-2px) rotate(.6deg); } }
@keyframes celebrate { to { transform: translateY(-7px) rotate(-4deg); } }
@keyframes wave { to { transform: rotate(-14deg); } }
@keyframes ponder { to { transform: rotate(-8deg); } }
@keyframes tremble { to { transform: translateX(2px) rotate(1deg); } }
@keyframes shrug { to { transform: translateY(-6px) scaleY(.97); } }
.character.still .body, .character.still .head, .character.still .right-arm, .character.still .sparkles { animation: none; transform: none; }
.mood-idle .eyes { transform-box: fill-box; transform-origin: center; animation: blink 5.6s ease-in-out infinite; }
.tail { transform-origin: 143px 166px; animation: tail-sway 4.8s ease-in-out infinite; }
.mood-idle.pose-normal .bow-arm { transform-origin: 145px 132px; animation: play-violin 2.4s ease-in-out infinite; }
@keyframes blink { 0%, 43%, 47%, 100% { transform: scaleY(1); } 45% { transform: scaleY(.12); } }
@keyframes tail-sway { 50% { transform: rotate(5deg); } }
@keyframes play-violin { 50% { transform: rotate(-4deg); } }
.character.still :is(.eyes, .tail, .bow-arm, .clasped-hands, .whistle-note) { animation: none; }
.character.still.pose-plead .head { transform: translateY(22px) scale(.88); }
.character:is(.swing, .lariat) .body { animation: none; }
.character.taunt .body { animation: teasing-sway var(--taunt-duration, 1400ms) ease-in-out both; }
.character.taunt :is(.head, .eyes, .tail) { animation: none; transform: none; }
.character.taunt.still .body { animation: none; transform: none; }
.character.still :deep(.character-taunt *) { animation: none; }
@keyframes teasing-sway { 0% { transform: rotate(-3deg); } 28% { transform: translateY(-3px) rotate(4deg); } 52% { transform: rotate(-4deg); } 76%, 100% { transform: rotate(2deg); } }
@media (prefers-reduced-motion: reduce) {
  .character * { animation: none !important; }
  .character.pose-plead .head { transform: translateY(22px) scale(.88); }
}
</style>
