import { describe, expect, it } from 'vitest';
import {
  ActivityDto,
  fromActivityDto,
  fromSubjectDto,
  fromTopicDto,
  fromWarningDto,
  toActivityRequest,
  toSubjectRequest,
  toTopicRequest,
} from './mappers';
import { mapUserDto } from './api';

const activityDto: ActivityDto = {
  id: 'a1',
  subjectId: 's1',
  topicId: null,
  title: 'Lecture',
  activityTypeId: 2,
  priority: 4,
  startTime: '2026-10-20T07:00:00.000Z',
  durationMinutes: 90,
  isRecurring: true,
  recurrence: { frequency: 'weekly', daysOfWeek: ['friday', 'monday'], until: '2026-12-31' },
  isNegotiable: false,
  notes: null,
  status: 'partiallyDone',
  isAutoPlanned: false,
};

describe('mappers', () => {
  it('subject: maps lookup ids and date-only exam dates both ways', () => {
    const subject = fromSubjectDto({
      id: 's1',
      name: 'Anatomy',
      examDate: '2027-01-20',
      planningMethodId: 2,
      priority: 7,
      studyMode: 'determined',
      colorHex: '#123456',
    });
    expect(subject).toEqual({
      id: 's1',
      title: 'Anatomy',
      examDate: new Date(2027, 0, 20),
      weight: 7,
      strategy: 'active-recall',
      mode: 'determined',
      color: '#123456',
    });

    const { id: _, ...rest } = subject;
    expect(toSubjectRequest(rest)).toEqual({
      name: 'Anatomy',
      examDate: '2027-01-20',
      planningMethodId: 2,
      priority: 7,
      studyMode: 'determined',
      colorHex: '#123456',
    });
    expect(toSubjectRequest({ ...rest, examDate: undefined, strategy: 'traffic-light' })).toMatchObject({
      examDate: null,
      planningMethodId: 1,
    });
  });

  it('topic: feedback is the knowledge level, empty notes become null', () => {
    const topic = fromTopicDto({
      id: 't1',
      subjectId: 's1',
      title: 'Heart',
      notes: null,
      feedback: 'yellow',
      order: 2,
      lastStudied: '2026-10-01T10:00:00Z',
      nextReview: null,
    });
    expect(topic).toMatchObject({ knowledge: 'yellow', notes: undefined, order: 2, nextReview: undefined });
    expect(topic.lastStudied).toEqual(new Date('2026-10-01T10:00:00Z'));
    expect(toTopicRequest({ ...topic, notes: '' })).toEqual({ title: 'Heart', notes: null, feedback: 'yellow', order: 2 });
  });

  it('activity: maps type, status, weekdays (sorted, Sunday = 0) and back', () => {
    const activity = fromActivityDto(activityDto);
    expect(activity).toMatchObject({
      type: 'class',
      status: 'partial',
      negotiable: false,
      subjectId: 's1',
      topicId: undefined,
      recurrencePattern: { frequency: 'weekly', daysOfWeek: [1, 5], until: new Date(2026, 11, 31) },
    });

    const { id: _, ...rest } = activity;
    expect(toActivityRequest(rest)).toEqual({ ...withoutReadOnly(activityDto), recurrence: { ...activityDto.recurrence, daysOfWeek: ['monday', 'friday'] } });
  });

  it('activity: a non-recurring or daily activity sends no weekdays', () => {
    const { id: _, ...activity } = fromActivityDto(activityDto);
    expect(toActivityRequest({ ...activity, recurring: false })).toMatchObject({ isRecurring: false, recurrence: null });
    expect(
      toActivityRequest({ ...activity, recurrencePattern: { frequency: 'daily', daysOfWeek: [1, 2] } }).recurrence,
    ).toEqual({ frequency: 'daily', daysOfWeek: [], until: null });
  });

  it('warning: date-only dates are local midnight', () => {
    expect(fromWarningDto({ date: '2026-10-21', severity: 'medium', message: 'Busy', suggestions: [] }).date).toEqual(
      new Date(2026, 9, 21),
    );
  });

  it('user: backend "user" accounts are students and the name is composed', () => {
    const user = mapUserDto({
      id: 'u1',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '2000-01-15',
      email: 'jane@example.com',
      dataPermission: true,
      role: 'user',
    });
    expect(user).toMatchObject({ role: 'student', name: 'Jane Doe' });
  });
});

function withoutReadOnly({ id: _, isAutoPlanned: __, ...dto }: ActivityDto) {
  return dto;
}
