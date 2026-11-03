// Pure helper behind the Calendar's overlapping blocks.

export interface LaneItem {
  start: Date;
  end: Date;
}

export type InLane<T> = T & {
  lane: number; // zero-based column
  lanes: number; // columns of the group of overlapping items this one belongs to
};

/**
 * Lays the items of one day out side by side: each takes the first column that is free at its start, and
 * everything linked by overlaps shares one column count, so widths line up. Items that merely touch do not overlap.
 */
export function layoutLanes<T extends LaneItem>(items: T[]): InLane<T>[] {
  const sorted = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime(),
  );
  const result: InLane<T>[] = [];
  let group: InLane<T>[] = [];
  let laneEnds: Date[] = [];
  let groupEnd = 0;

  const closeGroup = () => {
    for (const item of group) item.lanes = laneEnds.length;
    result.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start.getTime() >= groupEnd) closeGroup();
    const free = laneEnds.findIndex((end) => end <= item.start);
    const lane = free >= 0 ? free : laneEnds.length;
    laneEnds[lane] = item.end;
    group.push({ ...item, lane, lanes: 0 });
    groupEnd = Math.max(groupEnd, item.end.getTime());
  }
  closeGroup();

  return result;
}
