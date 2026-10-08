import { vi } from 'vitest';

/** Records what the sound player schedules; jsdom has no Web Audio. */
class FakeParam {
  value = 0;
  readonly setValueAtTime = vi.fn();
  readonly exponentialRampToValueAtTime = vi.fn();
}

class FakeNode {
  readonly connect = vi.fn((target: FakeNode) => target);
  readonly disconnect = vi.fn();
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type = '';
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
}

class FakeBuffer {
  readonly length: number;
  constructor(length: number) {
    this.length = length;
  }
  readonly getChannelData = vi.fn(() => new Float32Array(this.length));
}

export class FakeBufferSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  readonly start = vi.fn();
  readonly stop = vi.fn();
  onended: (() => void) | null = null;
}

export class FakeOscillator extends FakeNode {
  type = '';
  readonly frequency = new FakeParam();
  readonly start = vi.fn();
  readonly stop = vi.fn();
  onended: (() => void) | null = null;
}

export class FakeAudioContext {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  readonly sampleRate = 8000;
  readonly destination = new FakeNode();
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  readonly filters: FakeFilter[] = [];
  readonly buffers: FakeBuffer[] = [];
  readonly sources: FakeBufferSource[] = [];
  /** Set to false to act like a browser that refuses to start audio without a gesture. */
  allowResume = true;

  readonly resume = vi.fn(() => {
    if (this.allowResume) this.state = 'running';
    return Promise.resolve();
  });

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createBiquadFilter() {
    const filter = new FakeFilter();
    this.filters.push(filter);
    return filter;
  }

  createBuffer(_channels: number, length: number) {
    const buffer = new FakeBuffer(length);
    this.buffers.push(buffer);
    return buffer;
  }

  createBufferSource() {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source;
  }

  /** The fake in the shape the player expects. */
  asAudioContext(): AudioContext {
    return this as unknown as AudioContext;
  }
}
