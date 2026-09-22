<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';
interface Props { title: string }
defineProps<Props>();
const emit = defineEmits<{ (event: 'close'): void }>();
const dialog = ref<HTMLDialogElement | null>(null);
let previous: HTMLElement | null = null;
onMounted(() => { previous = document.activeElement instanceof HTMLElement ? document.activeElement : null; dialog.value?.showModal(); });
onUnmounted(() => previous?.focus());
</script>
<template><dialog ref="dialog" class="modal" aria-labelledby="dialog-title" @cancel.prevent="emit('close')" @click="($event.target === dialog) && emit('close')"><section class="modal-inner"><button class="modal-close text-button" aria-label="닫기" @click="emit('close')"><AppIcon name="close" /></button><h2 id="dialog-title">{{ title }}</h2><slot /></section></dialog></template>
<style scoped lang="scss">
.modal { color: var(--ink); background: var(--card); border: 1px solid var(--line); border-radius: 24px; padding: 0; width: min(480px, calc(100% - 32px)); max-height: calc(100dvh - 40px); box-shadow: 0 24px 100px #142e3533; }
.modal::backdrop { background: #142e3580; backdrop-filter: blur(5px); }
.modal-inner { padding: 38px 32px 32px; position: relative; }
.modal-close { position: absolute; right: 12px; top: 12px; }
h2 { font-size: 24px; margin-bottom: 24px; letter-spacing: -.04em; }
</style>
