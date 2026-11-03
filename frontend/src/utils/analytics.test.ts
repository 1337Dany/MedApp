import { describe, expect, it } from 'vitest';
import { daysOf, hoursByDay, periodOf, shiftPeriod, trailingPeriods } from './analytics';

// The tests run in Europe/Warsaw (vitest.config.ts): clocks changed on 25 Oct 2026 and change on 28 Mar 2027.
describe('day periods', () => {
  it('is one local day, whatever the time of the date', () => {
    const period = periodOf('day', new Date(2026, 9, 30, 15, 42));
    expect(period).toEqual({ kind: 'day', start: new Date(2026, 9, 30), end: new Date(2026, 9, 31) });
    expect(daysOf(period)).toEqual([new Date(2026, 9, 30)]);
  });

  it('keeps local midnights over the clock changes', () => {
    const autumn = periodOf('day', new Date(2026, 9, 25, 12));
    expect(autumn.end.getTime() - autumn.start.getTime()).toBe(25 * 3_600_000);
    const spring = periodOf('day', new Date(2027, 2, 28, 12));
    expect(spring.end.getTime() - spring.start.getTime()).toBe(23 * 3_600_000);
    expect(shiftPeriod(autumn, 1).start).toEqual(new Date(2026, 9, 26));
  });

  it('steps by days across months', () => {
    const period = periodOf('day', new Date(2026, 9, 31));
    expect(shiftPeriod(period, 1).start).toEqual(new Date(2026, 10, 1));
    expect(shiftPeriod(period, -31).start).toEqual(new Date(2026, 8, 30));
  });

  it('trails over days, oldest first', () => {
    const trend = trailingPeriods(periodOf('day', new Date(2026, 9, 30)), 14);
    expect(trend).toHaveLength(14);
    expect(trend[0].start).toEqual(new Date(2026, 9, 17));
    expect(trend[13].start).toEqual(new Date(2026, 9, 30));
  });

  it('labels the single bar with the date', () => {
    const [row] = hoursByDay([], periodOf('day', new Date(2026, 9, 30)));
    expect(row.label).toBe('Fri, Oct 30');
  });
});
