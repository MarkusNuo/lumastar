import { describe, expect, it } from 'vitest';
import type { Heatmap, HeatmapDay } from '../../api/types';
import { heatLevel, heatmapLayout } from './heatmap';
import { SAMPLE_STATS } from './sampleStats';

const DAY_MS = 86_400_000;

function day(date: string, fields: Partial<HeatmapDay> = {}): HeatmapDay {
  return { date, minutes: 0, xp: 0, lessons: 0, goalMet: false, frozen: false, ...fields };
}

/** `length` days from `from` (UTC dates, so no time-zone shift). */
function heatmapFrom(from: string, length: number): Heatmap {
  const start = Date.parse(`${from}T00:00:00Z`);
  const days = Array.from({ length }, (_, index) =>
    day(new Date(start + index * DAY_MS).toISOString().slice(0, 10)),
  );
  return { from, to: days.at(-1)?.date ?? from, days };
}

describe('heatLevel', () => {
  it.each([
    [day('2026-10-05'), 'none'],
    [day('2026-10-05', { minutes: 4, lessons: 1 }), 'practised'],
    [day('2026-10-05', { minutes: 0, lessons: 1 }), 'practised'],
    [day('2026-10-05', { minutes: 12, lessons: 3, goalMet: true }), 'goal'],
    [day('2026-10-05', { frozen: true }), 'frozen'],
  ] as const)('shows %o as %s', (entry, level) => {
    expect(heatLevel(entry)).toBe(level);
  });
});

describe('heatmapLayout', () => {
  it('puts the year into Monday-first week columns with today in the last one', () => {
    // 6 Oct 2025 and 5 Oct 2026 are both Mondays.
    const { weeks } = heatmapLayout(SAMPLE_STATS.heatmap);

    expect(weeks).toHaveLength(53);
    expect(weeks.slice(0, -1).every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.[0]?.date).toBe('2025-10-06');
    expect(weeks.at(-1)).toEqual([expect.objectContaining({ date: '2026-10-05', today: true })]);
    expect(weeks.flat().filter((cell) => cell?.today)).toHaveLength(1);
  });

  it('leaves the weekdays before the first day empty', () => {
    // 1 Oct 2026 is a Thursday.
    const { weeks } = heatmapLayout(heatmapFrom('2026-10-01', 5));

    expect(weeks[0]?.map((cell) => cell?.date ?? null)).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks[1]?.map((cell) => cell?.date)).toEqual(['2026-10-05']);
  });

  it('labels each month at the week it starts in', () => {
    const { months } = heatmapLayout(SAMPLE_STATS.heatmap);

    expect(months.slice(0, 4)).toEqual([
      { month: 9, column: 0 },
      { month: 10, column: 3 },
      { month: 11, column: 8 },
      { month: 0, column: 12 },
    ]);
    expect(months.at(-1)).toEqual({ month: 9, column: 51 });
    expect(months).toHaveLength(13);
  });

  it('drops the label of a partial month at the left edge when the next one starts close by', () => {
    // 22 Sep 2025 is a Monday; October starts two columns later.
    const { months } = heatmapLayout(heatmapFrom('2025-09-22', 30));

    expect(months[0]).toEqual({ month: 9, column: 1 });
  });

  it('counts practised days, met goals and bridged days', () => {
    const heatmap: Heatmap = {
      from: '2026-10-01',
      to: '2026-10-04',
      days: [
        day('2026-10-01', { minutes: 12, lessons: 3, goalMet: true }),
        day('2026-10-02', { frozen: true }),
        day('2026-10-03', { minutes: 3, lessons: 1 }),
        day('2026-10-04'),
      ],
    };

    expect(heatmapLayout(heatmap).totals).toEqual({ practised: 2, goals: 1, frozen: 1 });
  });
});
