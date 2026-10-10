import { Activity } from '../types';
import { addDays, startOfDay } from './dates';

export interface Occurrence {
  activity: Activity;
  start: Date;
  end: Date;
}

const MAX_DAYS = 400;

/**
 * Expands activities into concrete occurrences that overlap [rangeStart, rangeEnd).
 * A recurring activity repeats at the local time of day of its startTime, from its start date
 * until recurrencePattern.until (inclusive): every day, or on the listed weekdays (0 = Sunday).
 */
export function expandOccurrences(activities: Activity[], rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const result: Occurrence[] = [];

  for (const activity of activities) {
    const first = new Date(activity.startTime);
    const durationMs = activity.duration * 60_000;
    const pattern = activity.recurring ? activity.recurrencePattern : undefined;

    if (!pattern) {
      const end = new Date(first.getTime() + durationMs);
      if (first < rangeEnd && end > rangeStart) result.push({ activity, start: first, end });
      continue;
    }

    const weekdays = pattern.frequency === 'weekly' && pattern.daysOfWeek?.length ? pattern.daysOfWeek : null;
    const until = pattern.until ? startOfDay(new Date(pattern.until)) : null;

    // Start one day early so an occurrence crossing midnight into the range is included.
    let day = startOfDay(first > rangeStart ? first : addDays(rangeStart, -1));
    for (let i = 0; day < rangeEnd && i < MAX_DAYS; i++, day = addDays(day, 1)) {
      if (day < startOfDay(first)) continue;
      if (until && day > until) break;
      if (pattern.frequency === 'weekly' && !(weekdays ?? [first.getDay()]).includes(day.getDay())) continue;

      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), first.getHours(), first.getMinutes());
      const end = new Date(start.getTime() + durationMs);
      if (start < rangeEnd && end > rangeStart) result.push({ activity, start, end });
    }
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}
