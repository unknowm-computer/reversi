<script setup lang="ts">
interface Props { name: 'sound' | 'muted' | 'arrow' | 'undo' | 'flag' | 'close' | 'help' | 'leaf' | 'users' | 'globe' | 'spark' | 'copy' | 'home' | 'turn' | 'hint' }
defineProps<Props>();
const paths: Record<Props['name'], string> = {
  hint: 'M9 18h6m-5 3h4M9 15c0-2-3-3-3-6a6 6 0 0 1 12 0c0 3-3 4-3 6H9ZM3 5 1 4m20 1 2-1',
  turn: 'm8 5 11 7-11 7V5Z',
  sound: 'M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6', undo: 'M9 5 4 10l5 5M4 10h10a5 5 0 0 1 0 10',
  flag: 'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0', close: 'm6 6 12 12M6 18 18 6',
  help: 'M9 9a3 3 0 1 1 4 3v2m-1 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  leaf: 'M5 19C1 7 10 4 21 3c0 11-3 18-13 16m-5 3L16 9',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-4-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-4a4 4 0 0 1 0 8',
  globe: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2a20 20 0 0 1 0 20 20 20 0 0 1 0-20Z',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  copy: 'M9 9h12v12H9V9ZM15 5V3H3v12h2', home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3V10Z',
};
</script>
<template><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]" /></svg></template>
