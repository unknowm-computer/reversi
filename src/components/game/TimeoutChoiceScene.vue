<script setup lang="ts">
import { characterName, otherCharacter, type Character } from '../../../shared/game/types';
import CharacterArt from './CharacterArt.vue';
interface Props { recipient: Character }
defineProps<Props>();
</script>
<template>
  <div class="choice-scene" role="img" :aria-label="`${characterName(recipient)}가 무릎을 꿇고 두 손을 모아 용서를 구하고, ${characterName(otherCharacter(recipient))}는 팔짱을 끼고 웃으며 고민하고 있어요.`">
    <div class="character-side" aria-hidden="true">
      <span class="speech pleading">한 번만 봐줘~</span>
      <div class="figure"><CharacterArt :character="recipient" pose="plead" /></div>
      <span class="character-label">{{ characterName(recipient) }}</span>
    </div>
    <div class="character-side" aria-hidden="true">
      <span class="speech pondering">으음… 어쩔까?</span>
      <div class="figure"><CharacterArt :character="otherCharacter(recipient)" pose="consider" /></div>
      <span class="character-label">{{ characterName(otherCharacter(recipient)) }}</span>
    </div>
  </div>
</template>
<style scoped lang="scss">
.choice-scene { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 15px 8px 12px; margin-bottom: 18px; background: #eef1e0; border-radius: 20px; }
.character-side { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.figure { width: 100%; max-width: 170px; aspect-ratio: 220 / 230; }
.speech { position: relative; padding: 8px 10px; border-radius: 14px; background: var(--card); font-size: var(--text-caption); font-weight: 650; white-space: nowrap; }
.speech::after { content: ''; position: absolute; bottom: -5px; left: 45%; width: 10px; height: 10px; background: inherit; transform: rotate(45deg); }
.pleading { animation: ask-nicely 1.5s ease-in-out infinite; }
.pondering { animation: ponder-bubble 2.8s ease-in-out infinite; }
.character-label { font-size: var(--text-small); font-weight: 650; color: var(--text-accent); }
@keyframes ask-nicely { 50% { transform: translateY(3px) rotate(-2deg); } }
@keyframes ponder-bubble { 50% { transform: translateY(-3px); } }
@media (prefers-reduced-motion: reduce) { .speech { animation: none; } }
</style>
