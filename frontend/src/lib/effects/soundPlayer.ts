import type { FeedbackCue } from './cue';
import { SOUNDS, type NoiseBurst, type Note, type SoundRecipe } from './sounds';

/** Overall loudness of every effect; the recipes balance the sounds among each other. */
export const MASTER_VOLUME = 0.5;

/** Envelopes ramp exponentially, which cannot start or end at exactly zero. */
const SILENT = 0.0001;
const ATTACK_S = 0.006;
/** Scheduling slightly ahead avoids clicks when the context has just been resumed. */
const LEAD_S = 0.01;
/** Long enough for the longest noise burst; every burst reads a different part of it. */
const NOISE_SECONDS = 1;

export interface SoundPlayerOptions {
  /** Creates the AudioContext; returns null where Web Audio is unavailable. */
  createContext?: () => AudioContext | null;
  volume?: number;
}

export interface SoundPlayer {
  /** Creates or resumes the audio context; resolves true once it runs. Call it from a gesture. */
  unlock: () => Promise<boolean>;
  play: (cue: FeedbackCue) => void;
}

function browserAudioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  try {
    return new AudioContext({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
}

/**
 * Plays the synthesized effects through one lazily created AudioContext. Browsers only let audio
 * start after a user gesture, so the context is created on first use, never at app start.
 */
export function createSoundPlayer({
  createContext = browserAudioContext,
  volume = MASTER_VOLUME,
}: SoundPlayerOptions = {}): SoundPlayer {
  let audio: Audio | null = null;

  function ensureAudio() {
    if (!audio) {
      const context = createContext();
      if (!context) return null;
      const master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
      audio = { context, master, noise: null };
    }
    return audio;
  }

  async function resume(context: AudioContext): Promise<boolean> {
    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        // Without a gesture the browser refuses; the next gesture tries again.
      }
    }
    return context.state === 'running';
  }

  return {
    unlock: async () => {
      const current = ensureAudio();
      return current ? resume(current.context) : false;
    },
    play: (cue) => {
      const current = ensureAudio();
      if (!current) return;
      void resume(current.context);
      schedule(current, SOUNDS[cue]);
    },
  };
}

interface Audio {
  context: AudioContext;
  master: GainNode;
  /** White noise for whooshes and crackles, made on the first sound that needs it. */
  noise: AudioBuffer | null;
}

function schedule(audio: Audio, recipe: SoundRecipe): void {
  const { context } = audio;
  let output: AudioNode = audio.master;
  if (recipe.lowpassHz !== undefined) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = recipe.lowpassHz;
    filter.connect(audio.master);
    output = filter;
  }
  const start = context.currentTime + LEAD_S;
  for (const note of recipe.notes) playNote(context, output, note, start);
  for (const burst of recipe.noises ?? []) {
    audio.noise ??= whiteNoise(context);
    playNoise(context, output, audio.noise, burst, start);
  }
}

/** A fade-in and an exponential fade-out from `begin` to `end`. */
function envelope(context: AudioContext, peak: number, begin: number, end: number): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(SILENT, begin);
  gain.gain.exponentialRampToValueAtTime(peak, begin + ATTACK_S);
  gain.gain.exponentialRampToValueAtTime(SILENT, end);
  return gain;
}

function playNote(context: AudioContext, output: AudioNode, note: Note, start: number): void {
  const begin = start + note.at;
  const end = begin + note.duration;
  const oscillator = context.createOscillator();
  oscillator.type = note.wave;
  oscillator.frequency.setValueAtTime(note.frequency, begin);
  if (note.glideTo !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(note.glideTo, end);
  }
  const level = envelope(context, note.gain, begin, end);
  oscillator.connect(level).connect(output);
  oscillator.onended = () => level.disconnect();
  oscillator.start(begin);
  oscillator.stop(end + LEAD_S);
}

function playNoise(
  context: AudioContext,
  output: AudioNode,
  noise: AudioBuffer,
  burst: NoiseBurst,
  start: number,
): void {
  const begin = start + burst.at;
  const end = begin + burst.duration;
  const source = context.createBufferSource();
  source.buffer = noise;
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = burst.q;
  band.frequency.setValueAtTime(burst.frequency, begin);
  if (burst.glideTo !== undefined) band.frequency.exponentialRampToValueAtTime(burst.glideTo, end);
  const level = envelope(context, burst.gain, begin, end);
  source.connect(band).connect(level).connect(output);
  source.onended = () => {
    band.disconnect();
    level.disconnect();
  };
  // Starting at a different offset each time keeps repeated crackles from sounding identical.
  source.start(begin, (burst.at * 7) % (NOISE_SECONDS - burst.duration));
  source.stop(end + LEAD_S);
}

function whiteNoise(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(
    1,
    Math.round(context.sampleRate * NOISE_SECONDS),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
  return buffer;
}

/** The app's one player. */
export const soundPlayer = createSoundPlayer();
