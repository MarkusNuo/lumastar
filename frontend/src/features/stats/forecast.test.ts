import { describe, expect, it } from 'vitest';
import { forecastBars } from './forecast';
import { SAMPLE_STATS } from './sampleStats';

describe('forecastBars', () => {
  it('starts with today and names the following days by weekday', () => {
    const bars = forecastBars(SAMPLE_STATS.forecast);

    expect(bars.map((bar) => bar.label)).toEqual(['Heute', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    expect(bars[1]?.longLabel).toBe('Dienstag, 6. Oktober');
  });

  it('sizes every bar relative to the busiest day', () => {
    const bars = forecastBars(SAMPLE_STATS.forecast);

    expect(bars.map((bar) => bar.due)).toEqual([8, 34, 12, 0, 21, 6, 15]);
    expect(bars[1]?.share).toBe(1);
    expect(bars[3]?.share).toBe(0);
    expect(bars[0]?.share).toBeCloseTo(8 / 34);
  });

  it('keeps all bars flat when nothing is due', () => {
    const days = SAMPLE_STATS.forecast.days.map((entry) => ({ ...entry, due: 0 }));

    expect(forecastBars({ ...SAMPLE_STATS.forecast, days }).every((bar) => bar.share === 0)).toBe(
      true,
    );
  });
});
