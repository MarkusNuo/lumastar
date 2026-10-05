import type { FeedbackCue } from './cue';
import { SOUNDS, type SoundRecipe } from './sounds';

/** Overall loudness of every effect; the recipes balance the sounds among each other. */
export const MASTER_VOLUME = 0.5;

/** Envelopes ramp exponentially, which cannot start or end at exactly zero. */
const SILENT = 0.0001;
const ATTACK_S = 0.006;
/** Scheduling slightly ahead avoids clicks when the context has just been resumed. */
const LEAD_S = 0.01;

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
  let audio: { context: AudioContext; master: GainNode } | null = null;

  function ensureAudio() {
    if (!audio) {
      const context = createContext();
      if (!context) return null;
      const master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
      audio = { context, master };
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
      schedule(current.context, current.master, SOUNDS[cue]);
    },
  };
}

function schedule(context: AudioContext, destination: AudioNode, recipe: SoundRecipe): void {
  let output = destination;
  if (recipe.lowpassHz !== undefined) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = recipe.lowpassHz;
    filter.connect(destination);
    output = filter;
  }

  const start = context.currentTime + LEAD_S;
  for (const note of recipe.notes) {
    const begin = start + note.at;
    const end = begin + note.duration;

    const oscillator = context.createOscillator();
    oscillator.type = note.wave;
    oscillator.frequency.setValueAtTime(note.frequency, begin);
    if (note.glideTo !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(note.glideTo, end);
    }

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(SILENT, begin);
    envelope.gain.exponentialRampToValueAtTime(note.gain, begin + ATTACK_S);
    envelope.gain.exponentialRampToValueAtTime(SILENT, end);

    oscillator.connect(envelope).connect(output);
    oscillator.onended = () => envelope.disconnect();
    oscillator.start(begin);
    oscillator.stop(end + LEAD_S);
  }
}

/** The app's one player. */
export const soundPlayer = createSoundPlayer();
