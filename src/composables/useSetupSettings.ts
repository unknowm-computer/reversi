import { reactive, watch } from 'vue';
import { DEFAULT_SETTINGS, DEFAULT_AI_DIFFICULTY, type GameSettings, type Mode } from '../../shared/game/types';

export const SETUP_SETTINGS_KEY = 'reversi-settings';
const defaultModeSeconds: Record<Mode, GameSettings['seconds']> = { ai: 30, local: 30, online: 30 };
const allowedSeconds = [0, 30, 60] as const;

interface SetupPreferences {
  settings: GameSettings;
  modeSeconds: Record<Mode, GameSettings['seconds']>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validValue<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.find(option => option === value) ?? fallback;
}

function loadPreferences(): SetupPreferences {
  try {
    const saved = localStorage.getItem(SETUP_SETTINGS_KEY);
    const value: unknown = saved ? JSON.parse(saved) : null;
    if (isRecord(value) && isRecord(value.settings)) {
      const settings = value.settings;
      const times = isRecord(value.modeSeconds) ? value.modeSeconds : {};
      return {
        settings: {
          gameType: validValue(settings.gameType, ['reversi', 'gomoku', 'chess', 'janggi'] as const, 'reversi'),
          mode: validValue(settings.mode, ['ai', 'local', 'online'] as const, DEFAULT_SETTINGS.mode),
          seconds: validValue(settings.seconds, allowedSeconds, DEFAULT_SETTINGS.seconds),
          undoLimit: validValue(settings.undoLimit, [-1, 0, 1, 3] as const, DEFAULT_SETTINGS.undoLimit),
          blackCharacter: validValue(settings.blackCharacter, ['jannabi', 'grasshopper'] as const, DEFAULT_SETTINGS.blackCharacter),
          aiDifficulty: validValue(settings.aiDifficulty, [1, 2, 3, 4, 5] as const, DEFAULT_AI_DIFFICULTY),
          janggiBlackFormation: validValue(settings.janggiBlackFormation, ['outer', 'inner', 'left', 'right'] as const, 'outer'),
          janggiWhiteFormation: validValue(settings.janggiWhiteFormation, ['outer', 'inner', 'left', 'right'] as const, 'outer'),
        },
        modeSeconds: {
          ai: validValue(times.ai, allowedSeconds, 30),
          local: validValue(times.local, allowedSeconds, 30),
          online: validValue(times.online, allowedSeconds, 30),
        },
      };
    }
  } catch { /* Preference storage is optional; the setup still works without it. */ }
  return { settings: { ...DEFAULT_SETTINGS }, modeSeconds: { ...defaultModeSeconds } };
}

export function useSetupSettings(): { config: GameSettings } {
  const saved = loadPreferences();
  const config = reactive<GameSettings>(saved.settings);
  const modeSeconds = saved.modeSeconds;
  modeSeconds[config.mode] = config.seconds;

  watch(() => config.mode, (mode, previous) => {
    modeSeconds[previous] = config.seconds;
    config.seconds = modeSeconds[mode];
  }, { flush: 'sync' });

  watch(config, () => {
    modeSeconds[config.mode] = config.seconds;
    try {
      localStorage.setItem(SETUP_SETTINGS_KEY, JSON.stringify({ settings: config, modeSeconds }));
    } catch { /* Keep the selected settings usable when storage is unavailable or full. */ }
  }, { deep: true, flush: 'sync' });

  return { config };
}
