import {
  Activity,
  ActivityStatus,
  OverloadWarning,
  ActivityType,
  StudyStrategy,
  Subject,
  SubjectMode,
  Topic,
  TopicKnowledge,
} from '../types';
import { parseDateOnly, toDateInputValue } from '../utils/dates';

// Backend DTOs (MedApp.Services/DTOs). Enums arrive as camelCase strings, dates as ISO strings.

export interface SubjectDto {
  id: string;
  name: string;
  examDate: string | null;
  planningMethodId: number;
  priority: number;
  studyMode: SubjectMode;
  colorHex: string;
}

export interface TopicDto {
  id: string;
  subjectId: string;
  title: string;
  notes: string | null;
  feedback: TopicKnowledge;
  order: number;
  lastStudied: string | null;
  nextReview: string | null;
}

type BackendDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type BackendStatus = 'scheduled' | 'partiallyDone' | 'done' | 'skipped';

export interface ActivityDto {
  id: string;
  subjectId: string | null;
  topicId: string | null;
  title: string;
  activityTypeId: number;
  priority: number;
  startTime: string;
  durationMinutes: number;
  isRecurring: boolean;
  recurrence: { frequency: 'daily' | 'weekly'; daysOfWeek: BackendDay[]; until: string | null } | null;
  isNegotiable: boolean;
  notes: string | null;
  status: BackendStatus;
  isAutoPlanned: boolean;
}

export interface PlanningWarningDto {
  date: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestions: string[];
}

// Ids of the lookup rows seeded by the migrations (StudyStrategyConfig, ActivityTypeConfig).
const STRATEGY_IDS: Record<StudyStrategy, number> = { 'traffic-light': 1, 'active-recall': 2, manual: 3 };
const ACTIVITY_TYPE_IDS: Record<ActivityType, number> = {
  studying: 1,
  class: 2,
  rest: 3,
  sport: 4,
  work: 5,
  meal: 6,
  sleep: 7,
  commute: 8,
  'one-time': 9,
};
const STATUS_TO_BACKEND: Record<ActivityStatus, BackendStatus> = {
  scheduled: 'scheduled',
  partial: 'partiallyDone',
  done: 'done',
  skipped: 'skipped',
};
// Index = JavaScript Date.getDay() (0 = Sunday).
const DAYS: BackendDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const invert = <K extends string, V extends string | number>(map: Record<K, V>) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<V, K>;

const STRATEGY_BY_ID = invert(STRATEGY_IDS);
const ACTIVITY_TYPE_BY_ID = invert(ACTIVITY_TYPE_IDS);
const STATUS_FROM_BACKEND = invert(STATUS_TO_BACKEND);

const optionalDate = (value: string | null) => (value ? new Date(value) : undefined);

export const fromSubjectDto = (dto: SubjectDto): Subject => ({
  id: dto.id,
  title: dto.name,
  examDate: dto.examDate ? parseDateOnly(dto.examDate) : undefined,
  weight: dto.priority,
  strategy: STRATEGY_BY_ID[dto.planningMethodId] ?? 'manual',
  mode: dto.studyMode,
  color: dto.colorHex,
});

export const toSubjectRequest = (subject: Omit<Subject, 'id'>) => ({
  name: subject.title,
  examDate: subject.examDate ? toDateInputValue(new Date(subject.examDate)) : null,
  planningMethodId: STRATEGY_IDS[subject.strategy],
  priority: subject.weight,
  studyMode: subject.mode,
  colorHex: subject.color,
});

export const fromTopicDto = (dto: TopicDto): Topic => ({
  id: dto.id,
  subjectId: dto.subjectId,
  title: dto.title,
  notes: dto.notes ?? undefined,
  knowledge: dto.feedback,
  order: dto.order,
  lastStudied: optionalDate(dto.lastStudied),
  nextReview: optionalDate(dto.nextReview),
});

export const toTopicRequest = (topic: Partial<Topic>) => ({
  title: topic.title,
  notes: topic.notes || null,
  feedback: topic.knowledge,
  order: topic.order ?? null,
});

export const fromActivityDto = (dto: ActivityDto): Activity => ({
  id: dto.id,
  title: dto.title,
  type: ACTIVITY_TYPE_BY_ID[dto.activityTypeId] ?? 'one-time',
  startTime: new Date(dto.startTime),
  duration: dto.durationMinutes,
  recurring: dto.isRecurring,
  recurrencePattern: dto.recurrence
    ? {
        frequency: dto.recurrence.frequency,
        daysOfWeek: dto.recurrence.daysOfWeek.map((d) => DAYS.indexOf(d)).sort(),
        until: dto.recurrence.until ? parseDateOnly(dto.recurrence.until) : undefined,
      }
    : undefined,
  negotiable: dto.isNegotiable,
  priority: dto.priority,
  status: STATUS_FROM_BACKEND[dto.status] ?? 'scheduled',
  subjectId: dto.subjectId ?? undefined,
  topicId: dto.topicId ?? undefined,
  notes: dto.notes ?? undefined,
  autoPlanned: dto.isAutoPlanned,
});

export const fromWarningDto = (dto: PlanningWarningDto): OverloadWarning => ({
  date: parseDateOnly(dto.date),
  severity: dto.severity,
  message: dto.message,
  suggestions: dto.suggestions,
});

export const toActivityRequest = (activity: Omit<Activity, 'id'>) => {
  const pattern = activity.recurring ? activity.recurrencePattern : undefined;
  return {
    subjectId: activity.subjectId ?? null,
    topicId: activity.topicId ?? null,
    title: activity.title,
    activityTypeId: ACTIVITY_TYPE_IDS[activity.type],
    priority: activity.priority,
    startTime: new Date(activity.startTime).toISOString(),
    durationMinutes: activity.duration,
    isRecurring: !!pattern,
    recurrence: pattern
      ? {
          frequency: pattern.frequency,
          daysOfWeek: pattern.frequency === 'weekly' ? (pattern.daysOfWeek ?? []).map((d) => DAYS[d]) : [],
          until: pattern.until ? toDateInputValue(new Date(pattern.until)) : null,
        }
      : null,
    isNegotiable: activity.negotiable,
    notes: activity.notes || null,
    status: STATUS_TO_BACKEND[activity.status],
  };
};

export const toBackendStatus = (status: ActivityStatus) => STATUS_TO_BACKEND[status];
