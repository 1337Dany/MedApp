export type ActivityType = 'studying' | 'class' | 'rest' | 'sport' | 'work' | 'meal' | 'sleep' | 'commute' | 'one-time';

export type ActivityStatus = 'scheduled' | 'done' | 'partial' | 'skipped';

export type StudyStrategy = 'manual' | 'traffic-light' | 'active-recall';

export type SubjectMode = 'relaxed' | 'determined' | 'emergency';

export type TopicKnowledge = 'green' | 'yellow' | 'red';

export interface Activity {
  id: string;
  title: string;
  type: ActivityType;
  startTime: Date;
  duration: number; // minutes
  recurring: boolean;
  recurrencePattern?: {
    frequency: 'daily' | 'weekly';
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    until?: Date; // last day of the series (inclusive)
  };
  negotiable: boolean;
  priority: number; // 1-5
  status: ActivityStatus;
  subjectId?: string;
  topicId?: string;
  notes?: string;
  autoPlanned?: boolean; // created by the study planner (read-only)
}

export interface Topic {
  id: string;
  title: string;
  subjectId: string;
  knowledge: TopicKnowledge;
  notes?: string;
  order: number;
  lastStudied?: Date;
  nextReview?: Date;
}

export interface Subject {
  id: string;
  title: string;
  examDate?: Date;
  weight: number; // priority 1-10
  strategy: StudyStrategy;
  mode: SubjectMode;
  color: string;
}

export interface OverloadWarning {
  date: Date;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestions: string[];
}
