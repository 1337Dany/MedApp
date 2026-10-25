import { ActivityStatus, ActivityType, OccurrenceRecord } from '../types';
import { addDays, startOfDay } from './dates';

// Pure helpers behind the Analytics view (rules: docs/ANALYTICS.md).

export type PeriodKind = 'week' | 'month';

export interface Period {
  kind: PeriodKind;
  start: Date; // inclusive, local midnight
  end: Date; // exclusive
}

/** Weeks start on Sunday, like the calendar. */
export const startOfWeek = (date: Date) => addDays(startOfDay(date), -date.getDay());

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);

export function periodOf(kind: PeriodKind, date: Date): Period {
  const start = kind === 'week' ? startOfWeek(date) : startOfMonth(date);
  return { kind, start, end: kind === 'week' ? addDays(start, 7) : addMonths(start, 1) };
}

export const shiftPeriod = (period: Period, steps: number): Period =>
  periodOf(period.kind, period.kind === 'week' ? addDays(period.start, 7 * steps) : addMonths(period.start, steps));

/** The period and the ones before it, oldest first. */
export const trailingPeriods = (period: Period, count: number): Period[] =>
  Array.from({ length: count }, (_, i) => shiftPeriod(period, i - count + 1));

export const daysOf = (period: Period): Date[] => {
  const days: Date[] = [];
  for (let day = period.start; day < period.end; day = addDays(day, 1)) days.push(day);
  return days;
};

// Nine activity types fold into six groups, so the stacked chart stays within the validated palette.
export interface TypeGroup {
  key: string;
  label: string;
  color: string;
  types: ActivityType[];
}

export const TYPE_GROUPS: TypeGroup[] = [
  { key: 'study', label: 'Studying', color: '#2a78d6', types: ['studying'] },
  { key: 'class', label: 'Classes', color: '#eb6834', types: ['class'] },
  { key: 'sleep', label: 'Sleep', color: '#1baf7a', types: ['sleep'] },
  { key: 'rest', label: 'Rest & sport', color: '#eda100', types: ['rest', 'sport'] },
  { key: 'work', label: 'Work', color: '#e87ba4', types: ['work'] },
  { key: 'other', label: 'Meals, commute & other', color: '#008300', types: ['meal', 'commute', 'one-time'] },
];

export const groupOf = (type: ActivityType) => TYPE_GROUPS.find((g) => g.types.includes(type)) ?? TYPE_GROUPS[5];

const minutesBetween = (start: Date, end: Date) => Math.max(0, (end.getTime() - start.getTime()) / 60_000);

/** Minutes of the occurrence that fall inside [from, to) - an occurrence over midnight counts on both days. */
export const minutesWithin = (occurrence: OccurrenceRecord, from: Date, to: Date) =>
  minutesBetween(occurrence.start > from ? occurrence.start : from, occurrence.end < to ? occurrence.end : to);

const hours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

/** Hours per type group for each day of the period. */
export function hoursByDay(occurrences: OccurrenceRecord[], period: Period) {
  return daysOf(period).map((day) => {
    const next = addDays(day, 1);
    const row: Record<string, number | string | Date> = {
      day,
      label:
        period.kind === 'week'
          ? day.toLocaleDateString('en-US', { weekday: 'short' })
          : String(day.getDate()),
    };
    for (const group of TYPE_GROUPS) {
      row[group.key] = hours(
        occurrences
          .filter((o) => group.types.includes(o.type))
          .reduce((sum, o) => sum + minutesWithin(o, day, next), 0),
      );
    }
    return row;
  });
}

/** Total hours per type group in the period, largest first. */
export function hoursByGroup(occurrences: OccurrenceRecord[], period: Period) {
  return TYPE_GROUPS.map((group) => ({
    ...group,
    hours: hours(
      occurrences
        .filter((o) => group.types.includes(o.type))
        .reduce((sum, o) => sum + minutesWithin(o, period.start, period.end), 0),
    ),
  }));
}

// Credit for a session, the same as the teacher analytics: done counts fully, partially done half.
const CREDIT: Record<ActivityStatus, number> = { done: 1, partial: 0.5, scheduled: 0, skipped: 0 };

export const inPeriod = (occurrences: OccurrenceRecord[], period: Period) =>
  occurrences.filter((o) => o.start >= period.start && o.start < period.end);

export interface StudySummary {
  plannedHours: number; // every study session in the period
  studiedHours: number; // credited time of done / partially done sessions
  startedSessions: number; // sessions that have started by now
  completionRate: number | null; // percent of started sessions (credited); null without any
  averageSessionMinutes: number;
}

export function studySummary(occurrences: OccurrenceRecord[], now: Date): StudySummary {
  const study = occurrences.filter((o) => o.type === 'studying');
  const started = study.filter((o) => o.start < now);
  const credit = started.reduce((sum, o) => sum + CREDIT[o.status], 0);
  return {
    plannedHours: hours(study.reduce((sum, o) => sum + o.duration, 0)),
    studiedHours: hours(study.reduce((sum, o) => sum + o.duration * CREDIT[o.status], 0)),
    startedSessions: started.length,
    completionRate: started.length === 0 ? null : Math.round((100 * credit) / started.length),
    averageSessionMinutes: study.length === 0 ? 0 : Math.round(study.reduce((sum, o) => sum + o.duration, 0) / study.length),
  };
}

export interface StatusCount {
  status: ActivityStatus;
  label: string;
  color: string;
  count: number;
}

/** How the occurrences that already started were marked. */
export function statusBreakdown(occurrences: OccurrenceRecord[], now: Date): StatusCount[] {
  const started = occurrences.filter((o) => o.start < now);
  const rows: Omit<StatusCount, 'count'>[] = [
    { status: 'done', label: 'Done', color: '#0ca30c' },
    { status: 'partial', label: 'Partially done', color: '#fab219' },
    { status: 'skipped', label: 'Skipped', color: '#d03b3b' },
    { status: 'scheduled', label: 'Not marked', color: '#c3c2b7' },
  ];
  return rows.map((row) => ({ ...row, count: started.filter((o) => o.status === row.status).length }));
}

/** Study hours per subject in the period (planned and credited), largest first. */
export function studyBySubject(occurrences: OccurrenceRecord[]) {
  const bySubject = new Map<string, { planned: number; studied: number }>();
  for (const o of occurrences.filter((o) => o.type === 'studying' || o.type === 'class')) {
    const key = o.subjectId ?? '';
    const entry = bySubject.get(key) ?? { planned: 0, studied: 0 };
    entry.planned += o.duration;
    entry.studied += o.duration * CREDIT[o.status];
    bySubject.set(key, entry);
  }
  return [...bySubject.entries()]
    .map(([subjectId, { planned, studied }]) => ({ subjectId, planned: hours(planned), studied: hours(studied) }))
    .sort((a, b) => b.planned - a.planned);
}
