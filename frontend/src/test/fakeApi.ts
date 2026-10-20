import { http, HttpResponse, JsonBodyType } from 'msw';
import type { ActivityDto, PlanningWarningDto, SubjectDto, TopicDto } from '../services/mappers';
import type { ClassAnalytics } from '../services/api';

// In-memory stand-in for the MedApp API (backend/src/MedApp.API/Controllers), used by the component
// tests through MSW. It keeps the same routes and DTO shapes, scopes data to the caller like the real
// API does, and records every request so tests can assert what a button sent.

export const API = 'http://localhost/api';

type BackendRole = 'user' | 'teacher' | 'admin';

export interface FakeUser {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  password: string;
  dataPermission: boolean;
  role: BackendRole;
}

export interface RecordedRequest {
  method: string;
  path: string;
  body: any;
}

interface Failure {
  method: string;
  path: RegExp;
  status: number;
  body: JsonBodyType;
}

const problem = (status: number, title: string, errors?: Record<string, string[]>) =>
  HttpResponse.json({ status, title, ...(errors && { errors }) }, { status });

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

class FakeApi {
  users: FakeUser[] = [];
  subjects: (SubjectDto & { userId: string })[] = [];
  topics: TopicDto[] = [];
  activities: (ActivityDto & { userId: string })[] = [];
  warnings: PlanningWarningDto[] = [];
  analytics: ClassAnalytics = emptyAnalytics();
  requests: RecordedRequest[] = [];
  // Sessions the planner creates per eligible subject on POST /planning/generate.
  sessionsPerSubject = 2;
  private tokens = new Map<string, string>(); // access or refresh token -> user id
  private failures: Failure[] = [];

  reset() {
    this.users = [];
    this.subjects = [];
    this.topics = [];
    this.activities = [];
    this.warnings = [];
    this.analytics = emptyAnalytics();
    this.requests = [];
    this.sessionsPerSubject = 2;
    this.tokens.clear();
    this.failures = [];
  }

  /** The next matching request fails with this status and ProblemDetails body. */
  failNext(method: string, path: RegExp, status: number, body: JsonBodyType = { title: 'Something went wrong.' }) {
    this.failures.push({ method, path, status, body });
  }

  addUser(overrides: Partial<FakeUser> = {}): FakeUser {
    const user: FakeUser = {
      id: nextId('user'),
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '2000-01-15',
      email: `jane${counter}@example.com`,
      password: 'Secret123',
      dataPermission: false,
      role: 'user',
      ...overrides,
    };
    this.users.push(user);
    return user;
  }

  issueTokens(userId: string) {
    const accessToken = nextId(`access-${userId}`);
    const refreshToken = nextId(`refresh-${userId}`);
    this.tokens.set(accessToken, userId);
    this.tokens.set(refreshToken, userId);
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      refreshTokenExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      tokenType: 'Bearer',
    };
  }

  /** Makes every issued access token invalid, as if it had expired. */
  expireAccessTokens() {
    for (const token of [...this.tokens.keys()]) {
      if (token.startsWith('access-')) this.tokens.delete(token);
    }
  }

  addSubject(userId: string, overrides: Partial<SubjectDto> = {}) {
    const subject = {
      id: nextId('subject'),
      userId,
      name: 'Anatomy',
      examDate: null,
      planningMethodId: 3,
      priority: 5,
      studyMode: 'relaxed' as const,
      colorHex: '#3b82f6',
      ...overrides,
    };
    this.subjects.push(subject);
    return subject;
  }

  addTopic(subjectId: string, overrides: Partial<TopicDto> = {}) {
    const topic: TopicDto = {
      id: nextId('topic'),
      subjectId,
      title: 'Heart',
      notes: null,
      feedback: 'red',
      order: this.topics.filter((t) => t.subjectId === subjectId).length,
      lastStudied: null,
      nextReview: null,
      ...overrides,
    };
    this.topics.push(topic);
    return topic;
  }

  addActivity(userId: string, overrides: Partial<ActivityDto> = {}) {
    const activity = {
      id: nextId('activity'),
      userId,
      subjectId: null,
      topicId: null,
      title: 'Activity',
      activityTypeId: 1,
      priority: 3,
      startTime: new Date().toISOString(),
      durationMinutes: 60,
      isRecurring: false,
      recurrence: null,
      isNegotiable: true,
      notes: null,
      status: 'scheduled' as const,
      isAutoPlanned: false,
      ...overrides,
    };
    this.activities.push(activity);
    return activity;
  }

  /** Requests other than the background re-reads of the store (GETs). */
  writes(path?: RegExp) {
    return this.requests.filter((r) => r.method !== 'GET' && (!path || path.test(r.path)));
  }

  private userFrom(request: Request) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const id = token && this.tokens.get(token);
    return this.users.find((u) => u.id === id && token!.startsWith('access-'));
  }

  private takeFailure(method: string, path: string) {
    const index = this.failures.findIndex((f) => f.method === method && f.path.test(path));
    if (index < 0) return null;
    const [failure] = this.failures.splice(index, 1);
    return HttpResponse.json(failure.body, { status: failure.status });
  }

  private userDto = (u: FakeUser) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    dateOfBirth: u.dateOfBirth,
    email: u.email,
    dataPermission: u.dataPermission,
    role: u.role,
  });

  private subjectDto = ({ userId: _, ...s }: FakeApi['subjects'][number]): SubjectDto => s;
  private activityDto = ({ userId: _, ...a }: FakeApi['activities'][number]): ActivityDto => a;
  private ownSubject = (user: FakeUser, id: string | null | undefined) =>
    this.subjects.find((s) => s.id === id && s.userId === user.id);
  private ownTopic = (user: FakeUser, id: string | null | undefined) =>
    this.topics.find((t) => t.id === id && this.ownSubject(user, t.subjectId));

  // Wraps a route: records it, applies injected failures and (unless anonymous) requires a valid token.
  private route(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    handler: (args: { user: FakeUser; params: Record<string, string>; body: any; url: URL }) => Response,
    anonymous = false,
  ) {
    return http[method](`${API}${path}`, async ({ request, params }) => {
      const url = new URL(request.url);
      const text = await request.text();
      const body = text ? JSON.parse(text) : undefined;
      this.requests.push({ method: request.method, path: url.pathname.replace('/api', '') + url.search, body });

      const failure = this.takeFailure(request.method, url.pathname);
      if (failure) return failure;

      const user = this.userFrom(request);
      if (!anonymous && !user) return new HttpResponse(null, { status: 401 });
      return handler({ user: user!, params: params as Record<string, string>, body, url });
    });
  }

  handlers = [
    // Auth
    this.route(
      'post',
      '/auth/register',
      ({ body }) => {
        if (this.users.some((u) => u.email === body.email)) {
          return problem(400, 'One or more validation errors occurred.', { Email: ['Email is already registered.'] });
        }
        const user = this.addUser({ ...body, role: 'user' });
        return HttpResponse.json(this.issueTokens(user.id));
      },
      true,
    ),
    this.route(
      'post',
      '/auth/login',
      ({ body }) => {
        const user = this.users.find((u) => u.email === body.email && u.password === body.password);
        return user ? HttpResponse.json(this.issueTokens(user.id)) : problem(401, 'Invalid email or password.');
      },
      true,
    ),
    this.route(
      'post',
      '/auth/refresh',
      ({ body }) => {
        const userId = this.tokens.get(body.refreshToken);
        if (!userId || !body.refreshToken.startsWith('refresh-')) return problem(401, 'Invalid refresh token.');
        this.tokens.delete(body.refreshToken);
        return HttpResponse.json(this.issueTokens(userId));
      },
      true,
    ),
    this.route('post', '/auth/logout', ({ body }) => {
      this.tokens.delete(body.refreshToken);
      return new HttpResponse(null, { status: 204 });
    }),
    this.route('get', '/auth/me', ({ user }) => HttpResponse.json(this.userDto(user))),

    // Users
    this.route('put', '/users/me', ({ user, body }) => {
      if (!body.firstName) return problem(400, 'Validation failed', { FirstName: ["'First Name' must not be empty."] });
      Object.assign(user, body);
      return HttpResponse.json(this.userDto(user));
    }),
    this.route('get', '/users', ({ user }) =>
      user.role === 'admin' ? HttpResponse.json(this.users.map(this.userDto)) : new HttpResponse(null, { status: 403 }),
    ),
    this.route('put', '/users/:id/role', ({ user, params, body }) => {
      if (user.role !== 'admin') return new HttpResponse(null, { status: 403 });
      const target = this.users.find((u) => u.id === params.id);
      if (!target) return new HttpResponse(null, { status: 404 });
      target.role = body.role;
      return HttpResponse.json(this.userDto(target));
    }),

    // Teacher analytics
    this.route('get', '/teacher/analytics', ({ user }) =>
      user.role === 'user' ? new HttpResponse(null, { status: 403 }) : HttpResponse.json(this.analytics),
    ),

    // Subjects
    this.route('get', '/subjects', ({ user }) =>
      HttpResponse.json(this.subjects.filter((s) => s.userId === user.id).map(this.subjectDto)),
    ),
    this.route('post', '/subjects', ({ user, body }) =>
      HttpResponse.json(this.subjectDto(this.addSubject(user.id, body)), { status: 201 }),
    ),
    this.route('put', '/subjects/:id', ({ user, params, body }) => {
      const subject = this.ownSubject(user, params.id);
      if (!subject) return new HttpResponse(null, { status: 404 });
      Object.assign(subject, body);
      return HttpResponse.json(this.subjectDto(subject));
    }),
    this.route('delete', '/subjects/:id', ({ user, params }) => {
      if (!this.ownSubject(user, params.id)) return new HttpResponse(null, { status: 404 });
      this.subjects = this.subjects.filter((s) => s.id !== params.id);
      this.topics = this.topics.filter((t) => t.subjectId !== params.id);
      this.activities = this.activities.filter((a) => a.subjectId !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),

    // Topics
    this.route('get', '/topics', ({ user }) =>
      HttpResponse.json(this.topics.filter((t) => this.ownSubject(user, t.subjectId))),
    ),
    this.route('post', '/subjects/:id/topics', ({ user, params, body }) => {
      if (!this.ownSubject(user, params.id)) return new HttpResponse(null, { status: 404 });
      const { order: _, ...fields } = body;
      return HttpResponse.json(this.addTopic(params.id, fields), { status: 201 });
    }),
    this.route('put', '/topics/:id', ({ user, params, body }) => {
      const topic = this.ownTopic(user, params.id);
      if (!topic) return new HttpResponse(null, { status: 404 });
      if (body.feedback !== topic.feedback) {
        topic.lastStudied = new Date().toISOString();
        topic.nextReview = new Date(Date.now() + 3 * 86_400_000).toISOString();
      }
      Object.assign(topic, { ...body, order: body.order ?? topic.order });
      return HttpResponse.json(topic);
    }),
    this.route('delete', '/topics/:id', ({ user, params }) => {
      if (!this.ownTopic(user, params.id)) return new HttpResponse(null, { status: 404 });
      this.topics = this.topics.filter((t) => t.id !== params.id);
      for (const a of this.activities) if (a.topicId === params.id) a.topicId = null;
      return new HttpResponse(null, { status: 204 });
    }),

    // Activities
    this.route('get', '/activities', ({ user }) =>
      HttpResponse.json(this.activities.filter((a) => a.userId === user.id).map(this.activityDto)),
    ),
    this.route('post', '/activities', ({ user, body }) => {
      if (body.subjectId && !this.ownSubject(user, body.subjectId)) {
        return problem(400, 'Validation failed', { SubjectId: ['Subject does not exist.'] });
      }
      return HttpResponse.json(this.activityDto(this.addActivity(user.id, body)), { status: 201 });
    }),
    this.route('put', '/activities/:id', ({ user, params, body }) => {
      const activity = this.activities.find((a) => a.id === params.id && a.userId === user.id);
      if (!activity) return new HttpResponse(null, { status: 404 });
      Object.assign(activity, body, { isAutoPlanned: false });
      return HttpResponse.json(this.activityDto(activity));
    }),
    this.route('patch', '/activities/:id/status', ({ user, params, body }) => {
      const activity = this.activities.find((a) => a.id === params.id && a.userId === user.id);
      if (!activity) return new HttpResponse(null, { status: 404 });
      activity.status = body.status;
      return HttpResponse.json(this.activityDto(activity));
    }),
    this.route('delete', '/activities/:id', ({ user, params }) => {
      if (!this.activities.some((a) => a.id === params.id && a.userId === user.id)) {
        return new HttpResponse(null, { status: 404 });
      }
      this.activities = this.activities.filter((a) => a.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),

    // Planning: replaces future auto-planned sessions with new ones for subjects that use an automatic strategy
    // and have an upcoming exam (the real rules are in docs/PLANNING.md and covered by the backend tests).
    this.route('post', '/planning/generate', ({ user, body }) => {
      if (!(body.days >= 1 && body.days <= 28)) return problem(400, 'Validation failed', { Days: ['Invalid horizon.'] });
      const now = Date.now();
      this.activities = this.activities.filter(
        (a) => !(a.userId === user.id && a.isAutoPlanned && new Date(a.startTime).getTime() > now),
      );
      const eligible = this.subjects.filter(
        (s) => s.userId === user.id && s.planningMethodId !== 3 && s.examDate && new Date(s.examDate).getTime() > now,
      );
      const sessions = eligible.flatMap((subject, i) =>
        Array.from({ length: this.sessionsPerSubject }, (_, n) =>
          this.activityDto(
            this.addActivity(user.id, {
              title: `Study ${subject.name}`,
              subjectId: subject.id,
              startTime: new Date(now + (n + 1) * 86_400_000 + i * 3_600_000).toISOString(),
              isAutoPlanned: true,
            }),
          ),
        ),
      );
      return HttpResponse.json({ sessions, warnings: this.warnings });
    }),
    this.route('get', '/planning/warnings', () => HttpResponse.json(this.warnings)),
  ];
}

export function emptyAnalytics(): ClassAnalytics {
  return {
    insufficientData: true,
    minimumGroupSize: 5,
    totalStudents: 0,
    averageCompletionRate: 0,
    studentsAtRisk: 0,
    activeSubjects: 0,
    weeklyEngagement: [],
    subjectPerformance: [],
  };
}

export const fakeApi = new FakeApi();
