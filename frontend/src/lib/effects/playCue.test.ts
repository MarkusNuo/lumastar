import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevicePreferences } from './devicePreferences';
import { canVibrate, HAPTIC_PATTERNS, vibrate } from './haptics';
import { playCue, unlockAudioOnFirstGesture } from './playCue';
import { soundPlayer } from './soundPlayer';

function stubVibrate() {
  const vibrateSpy = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrateSpy });
  return vibrateSpy;
}

beforeEach(() => {
  useDevicePreferences.setState({ sound: true, haptics: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
});

describe('haptics', () => {
  it('detects whether the device can vibrate', () => {
    expect(canVibrate()).toBe(false);

    stubVibrate();

    expect(canVibrate()).toBe(true);
  });

  it('vibrates a single short pulse for correct and a double one for wrong', () => {
    const vibrateSpy = stubVibrate();

    vibrate('correct');
    vibrate('wrong');

    expect(vibrateSpy).toHaveBeenNthCalledWith(1, HAPTIC_PATTERNS.correct);
    expect(vibrateSpy).toHaveBeenNthCalledWith(2, [28, 60, 28]);
    expect(typeof HAPTIC_PATTERNS.correct).toBe('number');
  });

  it('vibrates longest at the end of a lesson', () => {
    const total = (pattern: number | number[]) => [pattern].flat().reduce((sum, ms) => sum + ms, 0);

    expect(total(HAPTIC_PATTERNS.complete)).toBeGreaterThan(total(HAPTIC_PATTERNS.wrong));
    expect(total(HAPTIC_PATTERNS.complete)).toBeGreaterThan(total(HAPTIC_PATTERNS.correct));
  });

  it('does nothing where the Vibration API is missing or refuses', () => {
    expect(() => vibrate('correct')).not.toThrow();

    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => {
        throw new DOMException('Not allowed.', 'NotAllowedError');
      },
    });

    expect(() => vibrate('wrong')).not.toThrow();
  });
});

describe('playCue', () => {
  it('plays sound and vibration when both are switched on', () => {
    const play = vi.spyOn(soundPlayer, 'play').mockImplementation(() => undefined);
    const vibrateSpy = stubVibrate();

    playCue('correct');

    expect(play).toHaveBeenCalledWith('correct');
    expect(vibrateSpy).toHaveBeenCalledWith(HAPTIC_PATTERNS.correct);
  });

  it('respects the "Töne" toggle', () => {
    const play = vi.spyOn(soundPlayer, 'play').mockImplementation(() => undefined);
    const vibrateSpy = stubVibrate();
    useDevicePreferences.getState().setSound(false);

    playCue('wrong');

    expect(play).not.toHaveBeenCalled();
    expect(vibrateSpy).toHaveBeenCalledOnce();
  });

  it('respects the "Vibration" toggle', () => {
    const play = vi.spyOn(soundPlayer, 'play').mockImplementation(() => undefined);
    const vibrateSpy = stubVibrate();
    useDevicePreferences.getState().setHaptics(false);

    playCue('complete');

    expect(play).toHaveBeenCalledWith('complete');
    expect(vibrateSpy).not.toHaveBeenCalled();
  });
});

describe('unlockAudioOnFirstGesture', () => {
  it('starts the audio with the first gesture and then stops listening', async () => {
    const unlock = vi.spyOn(soundPlayer, 'unlock').mockResolvedValue(true);
    const remove = unlockAudioOnFirstGesture();

    window.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() => expect(unlock).toHaveBeenCalledOnce());
    await Promise.resolve();
    window.dispatchEvent(new Event('keydown'));

    expect(unlock).toHaveBeenCalledOnce();
    remove();
  });

  it('keeps listening while the browser has not started the audio yet', async () => {
    const unlock = vi.spyOn(soundPlayer, 'unlock').mockResolvedValue(false);
    const remove = unlockAudioOnFirstGesture();

    window.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() => expect(unlock).toHaveBeenCalledOnce());
    await Promise.resolve();
    window.dispatchEvent(new Event('pointerup'));

    await vi.waitFor(() => expect(unlock).toHaveBeenCalledTimes(2));
    remove();
  });

  it('creates no audio while sounds are switched off', () => {
    const unlock = vi.spyOn(soundPlayer, 'unlock').mockResolvedValue(true);
    useDevicePreferences.getState().setSound(false);
    const remove = unlockAudioOnFirstGesture();

    window.dispatchEvent(new Event('pointerdown'));

    expect(unlock).not.toHaveBeenCalled();
    remove();
  });
});
