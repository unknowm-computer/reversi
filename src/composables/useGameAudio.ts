import { onUnmounted, ref } from 'vue';
type Scene = 'lobby' | 'game' | 'late' | 'off';
export function useGameAudio() {
  const enabled = ref(true);
  try { enabled.value = localStorage.getItem('reversi-sound') !== 'off'; } catch { /* Optional preference storage. */ }
  let context: AudioContext | null = null;
  let master: GainNode | null = null, music: GainNode | null = null;
  let scene: Scene = 'lobby', sequence = 0, nextNote = 0;
  const voices = new Set<OscillatorNode>();
  function tone(frequency: number, start: number, duration: number, volume: number, target: AudioNode, shape: OscillatorType = 'sine'): void {
    if (!context) return;
    const osc = context.createOscillator(), gain = context.createGain();
    osc.type = shape; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(target); osc.start(start); osc.stop(start + duration + 0.03);
    voices.add(osc); osc.onended = () => { voices.delete(osc); osc.disconnect(); gain.disconnect(); };
  }
  function clearVoices(): void { for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } } voices.clear(); }
  function changeScene(next: Scene): void {
    if (scene === next && music) return;
    scene = next; sequence = 0;
    if (!context || !master) return;
    const old = music;
    if (old) { old.gain.cancelScheduledValues(context.currentTime); old.gain.setTargetAtTime(0, context.currentTime, 0.25); }
    music = context.createGain(); music.gain.value = 0; music.connect(master);
    music.gain.linearRampToValueAtTime(0.22, context.currentTime + 0.8);
    // Disconnect the previous bus after its crossfade, without keeping a timer alive after disposal.
    if (old) {
      const retiring = old;
      const oscillator = context.createOscillator(); oscillator.frequency.value = 0;
      const silent = context.createGain(); silent.gain.value = 0;
      oscillator.connect(silent).connect(master); oscillator.start(); oscillator.stop(context.currentTime + 2);
      voices.add(oscillator); oscillator.onended = () => { voices.delete(oscillator); retiring.disconnect(); oscillator.disconnect(); silent.disconnect(); };
    }
    nextNote = context.currentTime + 0.03;
  }
  async function unlock(): Promise<void> {
    if (!enabled.value || document.hidden) return;
    try {
      if (!context) { context = new AudioContext(); master = context.createGain(); master.gain.value = 0.65; master.connect(context.destination); changeScene(scene); }
      if (context.state === 'suspended') await context.resume();
    } catch { /* Sound must never block gameplay when the browser denies audio. */ }
  }
  function sfx(kind: 'move' | 'pass' | 'reverse' | 'capture' | 'undo' | 'end' | 'tick' | 'urgent' | 'countdown' | 'timeout' | 'button' | 'bonk' | 'laugh' | 'whistle', count = 0): void {
    if (!enabled.value || !context || !master || context.state !== 'running' || document.hidden) return;
    if (kind === 'timeout') {
      tone(1320, context.currentTime, .22, .12, master, 'square');
      return;
    }
    if (kind === 'countdown') {
      // Alternate two short, percussive pitches for a clock-like tick-tock.
      tone(count % 2 === 0 ? 1900 : 1400, context.currentTime, .045, .09, master, 'triangle');
      tone(180, context.currentTime, .025, .035, master);
      return;
    }
    if (kind === 'laugh' || kind === 'whistle') {
      const notes = kind === 'laugh' ? [190, 165, 200, 155, 175, 140] : [1175, 1568, 1397, 1760, 1568];
      notes.forEach((note, index) => {
        const start = context!.currentTime + index * (kind === 'laugh' ? .17 : .22);
        const osc = context!.createOscillator(), gain = context!.createGain();
        osc.type = kind === 'laugh' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(note * (kind === 'laugh' ? 1.35 : .88), start);
        osc.frequency.exponentialRampToValueAtTime(note, start + .07);
        osc.frequency.exponentialRampToValueAtTime(note * (kind === 'laugh' ? .72 : 1.04), start + .16);
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(kind === 'laugh' ? .2 : .11, start + .025);
        gain.gain.exponentialRampToValueAtTime(.001, start + .19);
        osc.connect(gain).connect(master!); osc.start(start); osc.stop(start + .21);
        voices.add(osc); osc.onended = () => { voices.delete(osc); osc.disconnect(); gain.disconnect(); };
      });
      return;
    }
    const phrases: Record<typeof kind, number[]> = { move: [240], pass: [330, 220], reverse: [392, 494, 587, 784], capture: [523, 659, 784], undo: [660, 430, 510], end: [523, 659, 784, 1047], tick: [1100], urgent: [130, 110], button: [520], bonk: [180, 420, 260] };
    phrases[kind].forEach((note, index) => tone(note, context!.currentTime + index * 0.09, kind === 'end' ? 0.5 : 0.12, kind === 'tick' ? 0.035 : 0.13, master!));
    for (let i = 0; i < Math.min(count, 8); i++) tone(440 + i * 35, context.currentTime + 0.06 + i * 0.035, 0.07, 0.045, master, 'triangle');
  }
  const interval = window.setInterval(() => {
    if (!context || !music || !enabled.value || document.hidden || scene === 'off' || context.state !== 'running') return;
    const step = scene === 'late' ? 0.19 : scene === 'lobby' ? 0.31 : 0.38;
    if (nextNote < context.currentTime) nextNote = context.currentTime + 0.02;
    while (nextNote < context.currentTime + 0.12) {
      const melody = scene === 'lobby' ? [0, 4, 7, 11, 9, 7, 4, 2, 0, 4, 9, 7, 4, 2, -3, 2] : [0, 7, 12, 4, 2, 9, 14, 7, -3, 4, 9, 12, -5, 2, 7, 11];
      tone(261.63 * 2 ** (melody[sequence % melody.length] / 12), nextNote, step * 1.6, 0.13, music, 'triangle');
      if (sequence % 4 === 0) tone(130.81 * 2 ** ([0, 2, -3, -5][Math.floor(sequence / 4) % 4] / 12), nextNote, step * 3, 0.14, music);
      sequence++; nextNote += step;
    }
  }, 80);
  function reset(): void { clearVoices(); nextNote = context?.currentTime ?? 0; sequence = 0; }
  function visibility(): void {
    if (!context) return;
    if (document.hidden) { reset(); void context.suspend(); }
    else if (enabled.value) { nextNote = context.currentTime; void context.resume(); }
  }
  async function toggle(): Promise<void> {
    enabled.value = !enabled.value;
    try { localStorage.setItem('reversi-sound', enabled.value ? 'on' : 'off'); } catch { /* Optional preference storage. */ }
    if (enabled.value) await unlock(); else { reset(); if (context) await context.suspend(); }
  }
  document.addEventListener('visibilitychange', visibility);
  onUnmounted(() => { window.clearInterval(interval); document.removeEventListener('visibilitychange', visibility); reset(); void context?.close(); });
  return { enabled, unlock, toggle, sfx, changeScene, reset };
}
