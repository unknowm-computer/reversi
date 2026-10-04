<script setup lang="ts">
import { computed } from 'vue';
import {
  characterName,
  otherCharacter,
  sideName,
  type Character,
  type Color,
  type GameSettings,
} from '../../../shared/game/types';
import CharacterAvatar from '../common/CharacterAvatar.vue';

interface Props { settings: GameSettings; selfColor?: Color }
interface SetupPlayer {
  color: Color;
  character: Character;
  role: string;
  side: string;
  marker: 'black' | 'white' | 'cho' | 'han';
}
const props = withDefaults(defineProps<Props>(), { selfColor: 'black' });
const players = computed<SetupPlayer[]>(() => {
  const gameType = props.settings.gameType ?? 'reversi';
  return (['black', 'white'] as const).map((color): SetupPlayer => {
    const first = color === 'black';
    return {
      color,
      character: first ? props.settings.blackCharacter : otherCharacter(props.settings.blackCharacter),
      role: props.settings.mode === 'local'
        ? (first ? '선공' : '후공')
        : props.settings.mode === 'online' ? (color === props.selfColor ? '나' : '친구')
          : first ? '나' : 'AI 친구',
      side: sideName(gameType, color),
      marker: gameType === 'janggi' ? (first ? 'cho' : 'han') : gameType === 'chess' ? (first ? 'white' : 'black') : color,
    };
  });
});
</script>

<template>
  <div class="setup-players" aria-label="함께할 캐릭터">
    <section
      v-for="player in players"
      :key="player.color"
      class="setup-player"
      :class="player.character"
      :data-color="player.color"
      :aria-label="`${player.role} · ${characterName(player.character)} · ${player.side}`"
    >
      <div class="player-heading">
        <CharacterAvatar class="player-avatar" :character="player.character" />
        <div class="player-info">
          <h3 class="player-name">{{ characterName(player.character) }}</h3>
          <p class="player-identity">
            <span>{{ player.role }}</span>
            <span class="player-side"><span class="side-marker" :class="player.marker" aria-hidden="true" />{{ player.side }}</span>
          </p>
        </div>
      </div>
      <div v-if="$slots[player.color]" class="player-settings"><slot :name="player.color" /></div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '../../styles/tokens' as *;

.setup-players { container-type: inline-size; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.setup-player { --player-soft: color-mix(in srgb, var(--lime) 32%, var(--card)); display: flex; flex-direction: column; min-width: 0; padding: var(--space-3); border: 1px solid var(--line); border-radius: 16px; background: var(--player-soft); }
.setup-player.jannabi { --player-soft: color-mix(in srgb, var(--hint-soft) 55%, var(--card)); }
.player-heading { display: grid; grid-template-columns: clamp(36px, 11cqi, 48px) minmax(0, 1fr); align-items: center; gap: var(--space-2); }
.player-avatar { width: 100%; height: auto; aspect-ratio: 1; }
.player-info { min-width: 0; }
.player-name { font-size: var(--text-body); white-space: nowrap; }
.player-identity { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); margin-top: var(--space-1); color: var(--muted); font-size: var(--text-caption); }
.player-identity > span { white-space: nowrap; }
.player-side { display: inline-flex; align-items: center; gap: var(--space-1); white-space: nowrap; }
.side-marker { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
.side-marker.black { background: var(--ink); }
.side-marker.white { border: 1px solid var(--muted); background: var(--card); }
.side-marker.cho { background: #326a91; }
.side-marker.han { background: var(--danger); }
.player-settings { align-self: stretch; min-width: 0; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--line); text-align: left; }

@media (max-width: $mobile) {
  .setup-players { gap: var(--space-2); }
  .setup-player { padding: var(--space-2); }
  .player-heading { gap: var(--space-1); }
  .player-name { font-size: var(--text-small); }
  .player-identity { gap: var(--space-1); }
  .player-settings { margin-top: var(--space-2); padding-top: var(--space-2); }
}
</style>
