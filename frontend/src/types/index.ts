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
    until?: Date;
  };
  negotiable: boolean;
  priority: number; // 1-5
  status: ActivityStatus;
  subjectId?: string;
  topicId?: string;
  notes?: string;
}

export interface Topic {
  id: string;
  title: string;
  subjectId: string;
  sectionId?: string;
  knowledge: TopicKnowledge;
  notes?: string;
  order: number;
  lastStudied?: Date;
  nextReview?: Date;
}

export interface Section {
  id: string;
  title: string;
  subjectId: string;
  order: number;
}

export interface Subject {
  id: string;
  title: string;
  examDate?: Date;
  weight: number; // calculated or user-adjusted
  strategy: StudyStrategy;
  mode: SubjectMode;
  color: string;
}

export interface TimeBlock {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  duration: number; // minutes
  type: ActivityType;
  negotiable: boolean;
}

export interface OverloadWarning {
  date: Date;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestions: string[];
}
