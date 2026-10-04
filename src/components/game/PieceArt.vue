<script setup lang="ts">
import { computed, useId } from 'vue';
import type { GameType, Piece } from '../../../shared/game/types';

interface Props { piece: Piece; gameType: GameType }
const props = defineProps<Props>();
const artId = useId();
const woodEdgeId = `${artId}-wood-edge`;
const woodFaceId = `${artId}-wood-face`;
const chessBodyId = `${artId}-chess-body`;
const chessBaseId = `${artId}-chess-base`;
const janggiCharacter = computed<string>(() => ({
  general: props.piece.color === 'black' ? '楚' : '漢',
  rook: '車', cannon: '包', horse: '馬', elephant: '象', guard: '士',
  soldier: props.piece.color === 'black' ? '卒' : '兵',
  king: '', queen: '', bishop: '', knight: '', pawn: '',
})[props.piece.kind]);
</script>

<template>
  <svg v-if="gameType === 'janggi'" class="piece-art janggi-piece" :class="[piece.color, { general: piece.kind === 'general' }]" viewBox="0 0 80 80" aria-hidden="true">
    <defs>
      <linearGradient :id="woodEdgeId" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stop-color="#f8dda4" />
        <stop offset=".4" stop-color="#d9af69" />
        <stop offset="1" stop-color="#a8793c" />
      </linearGradient>
      <radialGradient :id="woodFaceId" cx=".32" cy=".2" r=".9">
        <stop offset="0" stop-color="#fffbed" />
        <stop offset=".62" stop-color="#f8e8c0" />
        <stop offset="1" stop-color="#e6c58b" />
      </radialGradient>
    </defs>
    <path class="piece-shadow" d="M25 6h30l20 20v30L55 76H25L5 56V26Z" />
    <path class="wood-edge" :fill="`url(#${woodEdgeId})`" d="M25 3h30l20 20v30L55 73H25L5 53V23Z" />
    <path class="wood-face" :fill="`url(#${woodFaceId})`" d="M26 7h28l17 17v28L54 69H26L9 52V24Z" />
    <path class="wood-light" d="M10 25 26 8h28l16 16" />
    <path class="wood-depth" d="m10 53 16 17h28l16-17" />
    <path class="wood-grain" d="M20 19c12-3 26 3 39 0M15 59c16-3 32 3 49 0" />
    <path class="wood-ring" d="M28 12h24l14 14v24L52 64H28L14 50V26Z" />
    <path v-if="piece.kind === 'general'" class="general-ring" d="M29 15h22l12 12v22L51 61H29L17 49V27Z" />
    <text x="40" y="51" text-anchor="middle">{{ janggiCharacter }}</text>
  </svg>
  <svg v-else class="piece-art chess-piece" :class="piece.color === 'black' ? 'ivory' : 'ebony'" viewBox="0 0 80 80" aria-hidden="true">
    <defs>
      <linearGradient :id="chessBodyId" x1=".1" y1="0" x2=".85" y2=".8">
        <stop offset="0" class="chess-light" />
        <stop offset=".3" class="chess-face" />
        <stop offset=".58" class="chess-shade" />
        <stop offset=".8" class="chess-face" />
        <stop offset="1" class="chess-depth" />
      </linearGradient>
      <linearGradient :id="chessBaseId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="chess-light" />
        <stop offset=".3" class="chess-face" />
        <stop offset="1" class="chess-depth" />
      </linearGradient>
    </defs>
    <ellipse class="ground-shadow" cx="40" cy="72" rx="26" ry="4" />
    <g class="chess-body" :fill="`url(#${chessBodyId})`">
      <template v-if="piece.kind === 'king'">
        <path d="M37 5h6v7h7v6h-7v7h-6v-7h-7v-6h7Z" />
        <path d="M30 45c-1-10-12-10-12-19 0-7 12-10 22 1 10-11 22-8 22-1 0 9-11 9-12 19Z" />
        <path d="M31 44h18l4 17H27Z" /><path class="detail" d="M40 28v13M30 48h20" />
      </template>
      <template v-else-if="piece.kind === 'queen'">
        <path d="m22 43-7-23 15 12 10-19 10 19 15-12-7 23Z" />
        <circle cx="15" cy="17" r="4" /><circle cx="40" cy="10" r="4" /><circle cx="65" cy="17" r="4" />
        <path d="M27 44h26l-5 8 6 10H26l6-10Z" /><path class="detail" d="M29 48h22" />
      </template>
      <template v-else-if="piece.kind === 'rook'">
        <path d="M19 13h11v9h7v-9h7v9h7v-9h10v21l-8 6 2 22H25l2-22-8-6Z" />
        <path class="detail" d="M20 32h40M28 40h24M27 55h26" />
      </template>
      <template v-else-if="piece.kind === 'bishop'">
        <circle cx="40" cy="9" r="4" />
        <path d="M40 14c-7 7-17 14-17 23 0 8 9 11 17 11s17-3 17-11c0-9-10-16-17-23Z" />
        <path class="detail" d="m44 23-8 12" /><path d="M33 47h14l7 15H26Z" />
      </template>
      <template v-else-if="piece.kind === 'knight'">
        <path d="M23 62c-2-11 5-20 18-24l-6-5-8 8c-2 2-4 2-6 0l-6-6c-1-1-1-3 0-4l14-18 8 2 9-8 3 12c14 8 19 26 8 43Z" />
        <path class="detail" d="m33 18 3 5M45 27c10 8 12 17 7 27M19 34l7 1" />
        <circle class="eye" cx="32" cy="27" r="2.5" />
      </template>
      <template v-else>
        <circle cx="40" cy="23" r="11" /><path d="M34 35h12c-4 10-2 18 7 26H27c9-8 11-16 7-26Z" />
        <path class="detail" d="M31 39h18" />
      </template>
      <path :fill="`url(#${chessBaseId})`" d="M25 60h30c2 0 3 2 4 4l2 4H19l2-4c1-2 2-4 4-4Z" />
      <path :fill="`url(#${chessBaseId})`" d="M20 68h40l1 3c0 2-1 3-3 3H22c-2 0-3-1-3-3Z" />
      <path class="base-highlight" d="M25 63h29M23 70h34" />
    </g>
  </svg>
</template>

<style scoped lang="scss">
.piece-art { display: block; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.piece-shadow { fill: #66411e55; }
.wood-edge { stroke: #986d36; stroke-width: 1.5; stroke-linejoin: round; }
.wood-face { stroke: #b58b50; stroke-width: .9; stroke-linejoin: round; }
.wood-light, .wood-depth, .wood-grain, .wood-ring, .general-ring { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.wood-light { stroke: #fff8de; stroke-width: 1.7; }
.wood-depth { stroke: #99692e; stroke-width: 1.6; opacity: .65; }
.wood-grain { stroke: #b99151; stroke-width: .7; opacity: .16; }
.wood-ring { stroke: #bb995f; stroke-width: .85; }
.general-ring { stroke: currentColor; stroke-width: .8; opacity: .3; }
.janggi-piece { color: #20567b; }.janggi-piece.white { color: #a2322b; }
.janggi-piece text { fill: currentColor; stroke: currentColor; stroke-width: .3; paint-order: stroke fill; font-family: 'Noto Serif CJK KR', 'Songti SC', 'Batang', serif; font-size: 38px; font-weight: 700; }
.janggi-piece.general text { font-size: 41px; }
.ground-shadow { fill: #122d2430; }
.chess-body { stroke: var(--piece-line); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.chess-piece.ivory { --piece-light: #fffef4; --piece-face: #fff2d0; --piece-shade: #e1c99a; --piece-depth: #bb9c65; --piece-line: #786748; --piece-detail: #9f8353; --piece-highlight: #fffdf0; }
.chess-piece.ebony { --piece-light: #819f8b; --piece-face: #3f6051; --piece-shade: #233d32; --piece-depth: #11291f; --piece-line: #102b20; --piece-detail: #a0b89b; --piece-highlight: #b3c8a9; }
.chess-light { stop-color: var(--piece-light); }.chess-face { stop-color: var(--piece-face); }
.chess-shade { stop-color: var(--piece-shade); }.chess-depth { stop-color: var(--piece-depth); }
.detail { fill: none; stroke: var(--piece-detail); stroke-width: 1.6; }.eye { fill: var(--piece-line); stroke: none; }
.base-highlight { fill: none; stroke: var(--piece-highlight); stroke-width: 1; opacity: .75; }
</style>
