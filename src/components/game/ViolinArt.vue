<script setup lang="ts">
interface Props { grip?: 'playing' | 'batting' }
withDefaults(defineProps<Props>(), { grip: 'playing' });
</script>
<template>
  <g class="violin" stroke-linecap="round" stroke-linejoin="round">
    <template v-if="grip === 'batting'">
      <path d="M-13-4H38v8H-13Z" fill="#68482f" stroke="#493e2d" stroke-width="2.5" />
      <path d="M35 0q-3-18 14-19 9 9 17-2 27-8 34 21-7 29-34 21-8-11-17-2Q32 18 35 0Z" fill="#b97942" stroke="#694931" stroke-width="3" />
      <path d="M43-2q9-10 17-7m17-7q12 1 15 14" fill="none" stroke="#dba15e" stroke-width="3" />
      <path d="M-9 0H89m-48-9 9 2m-9 16 9-2" stroke="#ead8a7" stroke-width="1.7" />
      <path d="M66-9v18" stroke="#694931" stroke-width="3" />
    </template>
    <template v-else>
    <path d="M106 125q-18 2-14 18 8 5 0 12-8 26 19 31 27-5 19-27-13-6-3-17 0-18-21-17Z" fill="#b97942" stroke="#694931" stroke-width="3" />
    <path d="M108 134v-29h8v31m-4 5v37" fill="none" stroke="#493e2d" stroke-width="4" />
    <path d="m98 166 2-10m22 10-2-10" fill="none" stroke="#694931" stroke-width="3" />
    </template>
  </g>
</template>
