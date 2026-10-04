<script setup lang="ts">
import { computed } from 'vue';
import { JANGGI_FORMATIONS, sideName, type Color, type JanggiFormation, type Piece } from '../../../shared/game/types';
import { JANGGI_FORMATION_PIECES } from '../../../shared/games/janggi/formations';
import PieceArt from './PieceArt.vue';

interface Props {
  formation?: JanggiFormation;
  color: Color;
}
const props = withDefaults(defineProps<Props>(), { formation: 'outer' });
const pieces = computed<Piece[]>(() => JANGGI_FORMATION_PIECES[props.formation].map(kind => ({ kind, color: props.color })));
const flanks = computed<Piece[][]>(() => [pieces.value.slice(0, 2), pieces.value.slice(2)]);
const description = computed<string>(() => {
  const name = JANGGI_FORMATIONS.find(formation => formation.value === props.formation)?.label.split(' · ')[0];
  const order = pieces.value.map(piece => piece.kind === 'horse' ? '마' : '상').join(', ');
  return `${sideName('janggi', props.color)} ${name} 포진. 내 진영에서 왼쪽부터 ${order}`;
});
</script>

<template>
  <figure class="formation-preview" :class="color" role="img" :aria-label="description">
    <div class="formation-board" aria-hidden="true">
      <div v-for="(flank, flankIndex) in flanks" :key="flankIndex" class="formation-flank">
        <div v-for="(piece, pieceIndex) in flank" :key="pieceIndex" class="formation-piece">
          <PieceArt :piece="piece" game-type="janggi" />
          <span>{{ piece.kind === 'horse' ? '마' : '상' }}</span>
        </div>
      </div>
    </div>
    <figcaption>내 진영 기준</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.formation-preview { min-width: 0; margin: var(--space-1) 0 0; }
.formation-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  padding: var(--space-1);
  border: 1px solid #c6a36d;
  border-radius: 8px;
  background: #ead39f;
}
.formation-flank { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px; min-width: 0; }
.formation-piece { display: grid; justify-items: center; align-content: start; min-width: 0; color: #315a73; font-size: var(--text-caption); line-height: 1.2; }
.white .formation-piece { color: #a64032; }
.formation-piece .piece-art { width: 100%; max-width: 36px; height: auto; aspect-ratio: 1; }
figcaption { margin-top: var(--space-1); color: var(--muted); font-size: var(--text-caption); line-height: 1.2; text-align: center; }
</style>
