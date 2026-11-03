import { describe, expect, it } from 'vitest';
import { expandOccurrences } from './recurrence';
import { Activity } from '../types';

const activity = (overrides: Partial<Activity>): Activity => ({
  id: 'a',
  title: 'A',
  type: 'class',
  startTime: new Date(2026, 9, 5, 9, 0), // Monday 5 Oct 2026, 09:00
  duration: 60,
  recurring: false,
  negotiable: false,
  priority: 3,
  status: 'scheduled',
  ...overrides,
});

const week = [new Date(2026, 9, 18), new Date(2026, 9, 25)] as const; // Sunday 18 – Sunday 25 Oct
const starts = (activities: Activity[], from: Date = week[0], to: Date = week[1]) =>
  expandOccurrences(activities, from, to).map((o) => `${o.start.getDate()} ${o.start.getHours()}:${o.start.getMinutes()}`);

describe('expandOccurrences', () => {
  it('keeps a one-off activity only when it overlaps the range', () => {
    expect(starts([activity({})])).toEqual([]);
    expect(starts([activity({ startTime: new Date(2026, 9, 20, 9) })])).toEqual(['20 9:0']);
  });

  it('repeats a daily series at the same local time', () => {
    expect(starts([activity({ recurring: true, recurrencePattern: { frequency: 'daily' } })])).toHaveLength(7);
  });

  it('repeats a weekly series on the listed weekdays, or on the start weekday when none are listed', () => {
    const weekly = (daysOfWeek?: number[]) =>
      activity({ recurring: true, recurrencePattern: { frequency: 'weekly', daysOfWeek } });
    expect(starts([weekly([1, 3])])).toEqual(['19 9:0', '21 9:0']);
    expect(starts([weekly([])])).toEqual(['19 9:0']);
  });

  it('stops after the until date (inclusive) and never starts before the first occurrence', () => {
    const series = activity({
      recurring: true,
      startTime: new Date(2026, 9, 20, 9),
      recurrencePattern: { frequency: 'daily', until: new Date(2026, 9, 22) },
    });
    expect(starts([series])).toEqual(['20 9:0', '21 9:0', '22 9:0']);
  });

  it('includes an occurrence that started the day before and runs into the range', () => {
    const sleep = activity({
      startTime: new Date(2026, 9, 1, 23, 0),
      duration: 480,
      recurring: true,
      recurrencePattern: { frequency: 'daily' },
    });
    expect(starts([sleep], new Date(2026, 9, 18), new Date(2026, 9, 19))[0]).toBe('17 23:0');
  });

  it('sorts occurrences of all activities by start', () => {
    const late = activity({ id: 'late', startTime: new Date(2026, 9, 19, 18) });
    const early = activity({ id: 'early', startTime: new Date(2026, 9, 19, 7) });
    expect(expandOccurrences([late, early], ...week).map((o) => o.activity.id)).toEqual(['early', 'late']);
  });
});
