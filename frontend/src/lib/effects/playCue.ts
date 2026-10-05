import type { FeedbackCue } from './cue';
import { useDevicePreferences } from './devicePreferences';
import { vibrate } from './haptics';
import { soundPlayer } from './soundPlayer';

/** Plays the sound and the vibration of a moment, as far as this device has them switched on. */
export function playCue(cue: FeedbackCue): void {
  const { sound, haptics } = useDevicePreferences.getState();
  if (sound) soundPlayer.play(cue);
  if (haptics) vibrate(cue);
}

/** Events that count as a user gesture for the browser's autoplay rules. */
const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const;

/**
 * Starts the audio context with the first gesture, so sounds that follow a network response (the
 * lesson end, the level reveal) can play too. Returns a function that removes the listeners.
 */
export function unlockAudioOnFirstGesture(target: Window = window): () => void {
  let unlocking = false;
  const remove = () => {
    for (const type of GESTURES) target.removeEventListener(type, onGesture, true);
  };
  function onGesture() {
    if (unlocking || !useDevicePreferences.getState().sound) return;
    unlocking = true;
    void soundPlayer.unlock().then((running) => {
      unlocking = false;
      if (running) remove();
    });
  }
  for (const type of GESTURES) target.addEventListener(type, onGesture, true);
  return remove;
}
