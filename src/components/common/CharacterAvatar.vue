<script setup lang="ts">
import { useId } from 'vue';
import type { Character, Reaction } from '../../../shared/game/types';
import CharacterArt from '../game/CharacterArt.vue';

interface Props {
  character: Character;
  mood?: Reaction;
}
withDefaults(defineProps<Props>(), { mood: 'idle' });
const portraitClipId = useId();
</script>

<template>
  <div class="character-avatar">
    <svg v-if="character === 'grasshopper'" class="portrait-clip" aria-hidden="true" width="0" height="0">
      <defs>
        <clipPath :id="portraitClipId" clipPathUnits="objectBoundingBox">
          <circle cx=".5" cy=".5" r=".5" />
          <!-- Open the top of the circular crop so the moving antennae remain visible. -->
          <rect x="-.15" y="-.25" width="1.3" height=".75" />
        </clipPath>
      </defs>
    </svg>
    <div class="avatar-crop" :class="{ 'with-antennae': character === 'grasshopper' }" :style="character === 'grasshopper' ? { clipPath: `url(#${portraitClipId})` } : undefined">
      <CharacterArt :character="character" :mood="mood" portrait />
    </div>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.character-avatar { position: relative; width: 100%; height: 100%; }
.avatar-crop { width: 100%; height: 100%; background: #e9e9dc; border-radius: 50%; overflow: hidden; }
.portrait-clip { position: absolute; }
.avatar-crop.with-antennae { overflow: visible; }
</style>
