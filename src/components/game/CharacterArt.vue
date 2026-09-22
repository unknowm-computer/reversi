<script setup lang="ts">
import type { Character, Reaction } from '../../../shared/game/types';
interface Props { character: Character; mood?: Reaction; decorative?: boolean; portrait?: boolean }
withDefaults(defineProps<Props>(), { mood: 'idle', decorative: true, portrait: false });
</script>
<template>
  <svg class="character" :class="[character, `mood-${mood}`, { portrait }]" :viewBox="portrait ? (character === 'jannabi' ? '26 0 168 168' : '33 0 148 148') : '0 0 220 230'" :aria-hidden="decorative" :role="decorative ? undefined : 'img'" :aria-label="decorative ? undefined : character === 'jannabi' ? '장난꾸러기 잔나비' : portrait ? '느긋한 베짱이' : '바이올린을 연주하는 베짱이'">
    <ellipse v-if="!portrait" cx="110" cy="210" rx="65" ry="9" fill="#203d2d" opacity=".1" />
    <g class="body">
      <template v-if="character === 'jannabi'">
        <path d="M149 161c44 36 74-8 49-26-20-14-28 12-11 12" fill="none" stroke="#946443" stroke-width="13" stroke-linecap="round" />
        <path d="M82 159 64 201q9 15 25 4l20-36m21-7 14 42q14 12 26-2l-16-48" fill="#946443" stroke="#664832" stroke-width="3" />
        <path d="M79 116q-23 41 6 67 29 13 61-5 23-34-9-64" fill="#a8764e" stroke="#664832" stroke-width="3" />
        <ellipse cx="112" cy="150" rx="28" ry="33" fill="#ecd2a5" />
        <path class="left-arm" d="M82 126q-32 0-40 30-7 14 5 18 13 4 16-12l27-17" fill="#a8764e" stroke="#664832" stroke-width="3" stroke-linejoin="round" />
        <g class="right-arm"><path d="M141 125q21 17 32 5l14-25q8-10 15-2 6 5 0 16l-18 30q-22 22-48 1" fill="#a8764e" stroke="#664832" stroke-width="3" />
          <path d="M184 90q-6 24 16 31 11-23 0-44-1 27-16 13" fill="#e8bf51" stroke="#98722b" stroke-width="2" />
        </g>
        <g class="head">
          <circle cx="58" cy="78" r="24" fill="#a8764e" stroke="#664832" stroke-width="3"/><circle cx="161" cy="78" r="24" fill="#a8764e" stroke="#664832" stroke-width="3"/>
          <circle cx="58" cy="78" r="13" fill="#ddb48b"/><circle cx="161" cy="78" r="13" fill="#ddb48b"/>
          <path d="M65 100q-21-54 24-69 22-7 35 0 50 5 34 70-11 33-47 33T65 100" fill="#a8764e" stroke="#664832" stroke-width="3"/>
          <path d="M80 103q-18-43 6-46 15-4 24 10 8-15 26-10 20 8 6 45 16 21-30 23-45 0-32-22" fill="#f1d9b0"/>
          <path d="m99 33 2-16 12 15 12-12 2 15" fill="#a8764e" stroke="#664832" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <g class="eyes"><ellipse cx="92" cy="82" rx="4" ry="7" fill="#352f28"/><ellipse cx="129" cy="82" rx="4" ry="7" fill="#352f28"/></g>
          <g v-if="mood === 'sly'" class="sly-face"><path d="m82 69 20 8m18 0 20-9" fill="none" stroke="#664832" stroke-width="5" stroke-linecap="round"/><path d="M87 103q25 32 50-7-28 15-50 7" fill="#fff8df" stroke="#664832" stroke-width="3"/><path d="m107 110 1 7m11-10 2 6" stroke="#664832" stroke-width="2"/></g>
          <path v-else-if="['sad','lose','urgent'].includes(mood)" d="M94 113q17-18 33 0" fill="none" stroke="#664832" stroke-width="3" stroke-linecap="round"/>
          <path v-else d="M91 105q21 24 42-3" fill="#fff8df" stroke="#664832" stroke-width="3" stroke-linejoin="round"/>
          <ellipse cx="110" cy="99" rx="7" ry="4" fill="#8e6249"/><circle cx="78" cy="99" r="7" fill="#ce8b67" opacity=".6"/><circle cx="145" cy="98" r="7" fill="#ce8b67" opacity=".6"/>
        </g>
      </template>
      <template v-else>
        <path d="m89 166-21 31-21 7m81-39 16 35 22 4" fill="none" stroke="#4a6745" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M76 115q-14 49 22 77 28 8 53-26 10-25-20-56" fill="#92aa60" stroke="#496341" stroke-width="3"/>
        <path d="M80 132q6 26 46 42l18-20-19-31" fill="#b2c47c"/><path d="M108 126q-7 31 27 55" fill="none" stroke="#758a4e" stroke-width="2"/>
        <g class="head">
          <path class="antenna" d="M88 55Q65 7 45 24m78 26q12-45 39-32" fill="none" stroke="#496341" stroke-width="4" stroke-linecap="round"/>
          <circle cx="44" cy="23" r="5" fill="#496341"/><circle cx="162" cy="18" r="5" fill="#496341"/>
          <path d="M59 76q-5-34 39-40 60-9 70 34 11 40-43 52-57 10-66-46" fill="#aabc77" stroke="#496341" stroke-width="3"/>
          <ellipse cx="89" cy="67" rx="16" ry="19" fill="#f6f2d5"/><ellipse cx="136" cy="65" rx="16" ry="19" fill="#f6f2d5"/>
          <g class="eyes"><ellipse cx="94" cy="71" rx="4" ry="7" fill="#304634"/><ellipse cx="140" cy="69" rx="4" ry="7" fill="#304634"/></g>
          <g v-if="mood === 'whistle'"><path d="M96 96q10 14 22 1" fill="none" stroke="#496341" stroke-width="3" stroke-linecap="round"/><ellipse cx="127" cy="97" rx="5" ry="4" fill="#496341"/><text class="whistle-note" x="159" y="75" fill="#496341" font-size="28">♪</text></g>
          <path v-else-if="['sad','lose','urgent'].includes(mood)" d="M98 104q15-13 28-2" fill="none" stroke="#496341" stroke-width="3" stroke-linecap="round"/>
          <path v-else d="M96 96q17 17 35-3" fill="none" stroke="#496341" stroke-width="3" stroke-linecap="round"/>
          <ellipse cx="77" cy="92" rx="9" ry="5" fill="#d1a078" opacity=".6"/><ellipse cx="148" cy="89" rx="9" ry="5" fill="#d1a078" opacity=".6"/>
          <path d="m80 45 10-4m38-4 12 4" stroke="#496341" stroke-width="3" stroke-linecap="round"/>
        </g>
        <path d="m89 118 16 4 16-5-4 13-15-3-15 5Z" fill="#c48343" stroke="#936036" stroke-width="2"/>
        <g class="violin" transform="rotate(-25 115 154)"><path d="M106 125q-18 2-14 18 8 5 0 12-8 26 19 31 27-5 19-27-13-6-3-17 0-18-21-17" fill="#b97942" stroke="#694931" stroke-width="3"/><path d="M108 134v-29h8v31m-4 5v37" fill="none" stroke="#493e2d" stroke-width="4"/><path d="m98 166 2-10m22 10-2-10" stroke="#694931" stroke-width="3" stroke-linecap="round"/></g>
        <path d="M76 124q-25 20 5 34l27-9" fill="none" stroke="#496341" stroke-width="9" stroke-linecap="round"/>
        <g class="right-arm"><path d="M145 127q30 13 14 30l-21 4" fill="none" stroke="#496341" stroke-width="9" stroke-linecap="round"/><path d="m96 133 75 44" stroke="#6d5437" stroke-width="4" stroke-linecap="round"/><path d="m96 138 72 43" stroke="#ead8a7" stroke-width="2"/></g>
      </template>
    </g>
    <g v-if="['happy','dance','win'].includes(mood)" fill="#c99a47" class="sparkles"><path d="m27 43 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm161 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></g>
    <g v-if="['urgent','sad'].includes(mood)" fill="#83b5bd"><path d="M177 66q-15 20 0 21 14-1 0-21"/><path d="M42 96q-10 15 0 16 10-1 0-16"/></g>
    <text v-if="mood === 'think'" x="180" y="42" fill="#738262" font-size="32" font-family="serif">?</text>
    <text v-if="mood === 'undo'" x="176" y="45" fill="#a97a45" font-size="22">…</text>
  </svg>
</template>
<style scoped lang="scss">
.character { width: 100%; height: 100%; overflow: visible; }
.portrait .body { transform-origin: 110px 80px; }
.mood-sly .head { animation: chuckle .22s ease-in-out infinite alternate; }
.mood-sly .eyes { transform: scaleY(.6); transform-origin: 110px 82px; }
.mood-whistle .head { animation: ponder .8s ease-in-out infinite alternate; }
.whistle-note { animation: whistle-note .7s ease-out infinite; }
@keyframes chuckle { to { transform: translateY(3px) rotate(-4deg); } }
@keyframes whistle-note { from { opacity: .4; transform: translateY(5px); } to { opacity: 1; transform: translateY(-5px); } }
.body { transform-origin: 110px 195px; animation: breathe 4s ease-in-out infinite; }
.head { transform-origin: 110px 105px; }
.right-arm { transform-origin: 144px 128px; }
.mood-happy .body, .mood-dance .body, .mood-win .body { animation: celebrate .65s ease-in-out infinite alternate; }
.mood-win .right-arm, .mood-dance .right-arm { animation: wave .5s ease-in-out infinite alternate; }
.mood-think .head, .mood-undo .head { animation: ponder 1.4s ease-in-out infinite alternate; }
.mood-urgent .body { animation: tremble .15s linear infinite alternate; }
.mood-sad .head, .mood-lose .head { transform: rotate(12deg) translateY(9px); }
.mood-lose .body { transform: rotate(15deg) translateY(15px); animation: none; }
.mood-draw .body { transform: rotate(-8deg) translateY(12px); animation: breathe 5s infinite; }
.mood-annoyed .eyes { transform: scaleY(.55); transform-origin: center 78px; }
.mood-pass .body { animation: shrug 1s ease-in-out infinite alternate; }
@keyframes breathe { 50% { transform: translateY(-3px) rotate(1deg); } }
@keyframes celebrate { to { transform: translateY(-10px) rotate(-6deg); } }
@keyframes wave { to { transform: rotate(-22deg); } }
@keyframes ponder { to { transform: rotate(-8deg); } }
@keyframes tremble { to { transform: translateX(2px) rotate(1deg); } }
@keyframes shrug { to { transform: translateY(-6px) scaleY(.97); } }
</style>
