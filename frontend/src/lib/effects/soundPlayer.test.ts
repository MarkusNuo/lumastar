import { describe, expect, it, vi } from 'vitest';
import { FakeAudioContext } from '../../test/fakeAudioContext';
import { FEEDBACK_CUES } from './cue';
import { createSoundPlayer, MASTER_VOLUME } from './soundPlayer';
import { SOUNDS } from './sounds';

function playerWithFake() {
  const fake = new FakeAudioContext();
  const createContext = vi.fn(() => fake.asAudioContext());
  return { fake, createContext, player: createSoundPlayer({ createContext }) };
}

describe('sound recipes', () => {
  it.each(FEEDBACK_CUES)('keeps the %s sound short and below full level', (cue) => {
    const { notes, noises = [] } = SOUNDS[cue];
    const parts = [...notes, ...noises];
    const length = Math.max(...parts.map((part) => part.at + part.duration));

    expect(notes.length).toBeGreaterThan(0);
    expect(length).toBeLessThanOrEqual(1.5);
    for (const part of parts) {
      expect(part.gain).toBeGreaterThan(0);
      expect(part.gain).toBeLessThanOrEqual(1);
    }
  });
});

describe('createSoundPlayer', () => {
  it('creates no audio context before the first sound', () => {
    const { createContext } = playerWithFake();

    expect(createContext).not.toHaveBeenCalled();
  });

  it('creates the context once and routes every sound through the master volume', () => {
    const { fake, createContext, player } = playerWithFake();

    player.play('correct');
    player.play('wrong');

    expect(createContext).toHaveBeenCalledOnce();
    const [master] = fake.gains;
    expect(master?.gain.value).toBe(MASTER_VOLUME);
    expect(master?.connect).toHaveBeenCalledWith(fake.destination);
  });

  it('schedules one oscillator per note and stops each of them', () => {
    const { fake, player } = playerWithFake();

    player.play('complete');

    expect(fake.oscillators).toHaveLength(SOUNDS.complete.notes.length);
    for (const oscillator of fake.oscillators) {
      expect(oscillator.start).toHaveBeenCalledOnce();
      expect(oscillator.stop).toHaveBeenCalledOnce();
    }
  });

  it('softens sounds that ask for a low-pass filter', () => {
    const { fake, player } = playerWithFake();

    player.play('wrong');

    expect(fake.filters).toHaveLength(1);
    expect(fake.filters[0]?.frequency.value).toBe(SOUNDS.wrong.lowpassHz);
  });

  it('lets the flame whoosh and crackle with band-passed noise', () => {
    const { fake, player } = playerWithFake();
    const noises = SOUNDS.streak.noises ?? [];

    player.play('streak');
    player.play('streak');

    expect(noises.length).toBeGreaterThan(1);
    expect(fake.buffers).toHaveLength(1);
    expect(fake.sources).toHaveLength(noises.length * 2);
    for (const source of fake.sources) {
      expect(source.buffer).toBe(fake.buffers[0]);
      expect(source.start).toHaveBeenCalledOnce();
      expect(source.stop).toHaveBeenCalledOnce();
    }
    const bands = fake.filters.filter((filter) => filter.type === 'bandpass');
    expect(bands.map((band) => band.Q.value)).toEqual(
      [...noises, ...noises].map((noise) => noise.q),
    );
  });

  it('resumes a suspended context when playing', () => {
    const { fake, player } = playerWithFake();

    player.play('tap');

    expect(fake.resume).toHaveBeenCalledOnce();
  });

  it('reports whether unlocking started the audio', async () => {
    const { fake, player } = playerWithFake();
    fake.allowResume = false;

    expect(await player.unlock()).toBe(false);

    fake.allowResume = true;
    expect(await player.unlock()).toBe(true);
  });

  it('stays silent without Web Audio', async () => {
    const player = createSoundPlayer({ createContext: () => null });

    expect(() => player.play('correct')).not.toThrow();
    expect(await player.unlock()).toBe(false);
  });
});
