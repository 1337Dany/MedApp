import { AuthTokens, BackendRole, RegisterPayload, User, UserRole } from '../types/auth';
import { Activity, ActivityStatus, Subject, Topic } from '../types';
import { authenticatedFetch, publicFetch } from './http';
import {
  ActivityDto,
  PlanningWarningDto,
  SubjectDto,
  TopicDto,
  fromActivityDto,
  fromWarningDto,
  fromSubjectDto,
  fromTopicDto,
  toActivityRequest,
  toBackendStatus,
  toSubjectRequest,
  toTopicRequest,
} from './mappers';

interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  dataPermission: boolean;
  role: BackendRole;
}

const ROLE_FROM_BACKEND: Record<BackendRole, UserRole> = {
  user: 'student',
  teacher: 'teacher',
  admin: 'admin',
};

export const mapUserDto = (dto: UserDto): User => ({
  id: dto.id,
  email: dto.email,
  firstName: dto.firstName,
  lastName: dto.lastName,
  name: `${dto.firstName} ${dto.lastName}`.trim(),
  dateOfBirth: dto.dateOfBirth,
  dataPermission: dto.dataPermission,
  role: ROLE_FROM_BACKEND[dto.role] ?? 'student',
});

// Authentication API -> backend/src/MedApp.API/Controllers/AuthController.cs
export const authAPI = {
  register: (payload: RegisterPayload) =>
    publicFetch<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (email: string, password: string) =>
    publicFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: (refreshToken: string) =>
    authenticatedFetch<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getCurrentUser: async (): Promise<User> => mapUserDto(await authenticatedFetch<UserDto>('/auth/me')),
};

const ROLE_TO_BACKEND: Record<UserRole, BackendRole> = {
  student: 'user',
  teacher: 'teacher',
  admin: 'admin',
};

export interface ProfileUpdate {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  dataPermission: boolean;
}

// Profile, consent and role management -> UsersController
export const usersAPI = {
  updateMe: async (profile: ProfileUpdate) =>
    mapUserDto(await authenticatedFetch<UserDto>('/users/me', { method: 'PUT', body: JSON.stringify(profile) })),
  // Admin only
  getAll: async () => (await authenticatedFetch<UserDto[]>('/users')).map(mapUserDto),
  setRole: async (id: string, role: UserRole) =>
    mapUserDto(
      await authenticatedFetch<UserDto>(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: ROLE_TO_BACKEND[role] }),
      }),
    ),
};

// Aggregated, anonymized class data -> TeacherController (teachers and admins)
export interface ClassAnalytics {
  insufficientData: boolean;
  minimumGroupSize: number;
  totalStudents: number;
  averageCompletionRate: number;
  studentsAtRisk: number;
  activeSubjects: number;
  weeklyEngagement: { week: string; weekStart: string; avgStudyHours: number; avgCompletionRate: number }[];
  subjectPerformance: { subject: string; students: number; avgKnowledge: number; studentsStruggling: number }[];
}

export const teacherAPI = {
  getClassAnalytics: () => authenticatedFetch<ClassAnalytics>('/teacher/analytics'),
};

// Study data -> SubjectsController, TopicsController, ActivitiesController
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const subjectsAPI = {
  getAll: async () => (await authenticatedFetch<SubjectDto[]>('/subjects')).map(fromSubjectDto),
  create: async (subject: Omit<Subject, 'id'>) =>
    fromSubjectDto(await authenticatedFetch<SubjectDto>('/subjects', json('POST', toSubjectRequest(subject)))),
  update: async (id: string, subject: Omit<Subject, 'id'>) =>
    fromSubjectDto(await authenticatedFetch<SubjectDto>(`/subjects/${id}`, json('PUT', toSubjectRequest(subject)))),
  remove: (id: string) => authenticatedFetch<void>(`/subjects/${id}`, { method: 'DELETE' }),
};

export const topicsAPI = {
  getAll: async () => (await authenticatedFetch<TopicDto[]>('/topics')).map(fromTopicDto),
  create: async (subjectId: string, topic: Partial<Topic>) =>
    fromTopicDto(
      await authenticatedFetch<TopicDto>(`/subjects/${subjectId}/topics`, json('POST', toTopicRequest(topic))),
    ),
  update: async (id: string, topic: Partial<Topic>) =>
    fromTopicDto(await authenticatedFetch<TopicDto>(`/topics/${id}`, json('PUT', toTopicRequest(topic)))),
  remove: (id: string) => authenticatedFetch<void>(`/topics/${id}`, { method: 'DELETE' }),
};

export const activitiesAPI = {
  getAll: async () => (await authenticatedFetch<ActivityDto[]>('/activities')).map(fromActivityDto),
  create: async (activity: Omit<Activity, 'id'>) =>
    fromActivityDto(await authenticatedFetch<ActivityDto>('/activities', json('POST', toActivityRequest(activity)))),
  update: async (id: string, activity: Omit<Activity, 'id'>) =>
    fromActivityDto(
      await authenticatedFetch<ActivityDto>(`/activities/${id}`, json('PUT', toActivityRequest(activity))),
    ),
  setStatus: async (id: string, status: ActivityStatus) =>
    fromActivityDto(
      await authenticatedFetch<ActivityDto>(`/activities/${id}/status`, json('PATCH', { status: toBackendStatus(status) })),
    ),
  remove: (id: string) => authenticatedFetch<void>(`/activities/${id}`, { method: 'DELETE' }),
};

// Study planner -> PlanningController (rules: docs/PLANNING.md)
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const planningAPI = {
  generate: async (days: number) => {
    const result = await authenticatedFetch<{ sessions: ActivityDto[]; warnings: PlanningWarningDto[] }>(
      '/planning/generate',
      json('POST', { timeZone: browserTimeZone(), days }),
    );
    return { sessions: result.sessions.map(fromActivityDto), warnings: result.warnings.map(fromWarningDto) };
  },
  getWarnings: async () =>
    (
      await authenticatedFetch<PlanningWarningDto[]>(
        `/planning/warnings?timeZone=${encodeURIComponent(browserTimeZone())}`,
      )
    ).map(fromWarningDto),
};
