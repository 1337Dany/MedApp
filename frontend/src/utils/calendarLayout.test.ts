import { describe, expect, it } from 'vitest';
import { layoutLanes } from './calendarLayout';

const at = (hours: number) => new Date(2026, 9, 30, Math.floor(hours), (hours % 1) * 60);
const item = (id: string, from: number, to: number) => ({ id, start: at(from), end: at(to) });
const lanesOf = (items: ReturnType<typeof item>[]) =>
  Object.fromEntries(layoutLanes(items).map((i) => [i.id, [i.lane, i.lanes]]));

describe('layoutLanes', () => {
  it('leaves items that do not overlap at full width, also when they touch', () => {
    expect(lanesOf([item('a', 9, 10), item('b', 10, 11), item('c', 14, 15)])).toEqual({
      a: [0, 1],
      b: [0, 1],
      c: [0, 1],
    });
  });

  it('puts items with the same time in a lane each', () => {
    expect(lanesOf([item('a', 9, 10), item('b', 9, 10), item('c', 9, 10)])).toEqual({
      a: [0, 3],
      b: [1, 3],
      c: [2, 3],
    });
  });

  it('reuses a lane that became free and shares the count across the linked group', () => {
    // a overlaps b, b overlaps c, a and c do not: two lanes for the whole chain.
    expect(lanesOf([item('c', 11, 13), item('a', 9, 11), item('b', 10, 12)])).toEqual({
      a: [0, 2],
      b: [1, 2],
      c: [0, 2],
    });
  });

  it('starts over after a gap', () => {
    expect(lanesOf([item('a', 9, 10), item('b', 9, 10), item('c', 12, 13)])).toEqual({
      a: [0, 2],
      b: [1, 2],
      c: [0, 1],
    });
  });

  it('puts the longer of two with the same start first and keeps the extra fields', () => {
    const [first] = layoutLanes([item('short', 9, 10), item('long', 9, 12)]);
    expect(first).toMatchObject({ id: 'long', lane: 0, lanes: 2 });
  });

  it('handles an empty day', () => {
    expect(layoutLanes([])).toEqual([]);
  });
});
