import { AuthTokens, BackendRole, RegisterPayload, User } from '../types/auth';

// API configuration
// Vite exposes env vars prefixed with VITE_ via import.meta.env.
// Set VITE_API_URL in a .env file to point at your backend, e.g.
//   VITE_API_URL=http://localhost:8080/api
const API_BASE_URL =
    (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080/api';

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------
const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (tokens: AuthTokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ---------------------------------------------------------------------------
// Low level fetch helpers
// ---------------------------------------------------------------------------

/**
 * Performs a fetch against the API and returns the parsed JSON body
 * (or null for empty / 204 No Content responses). Throws an Error with a
 * useful message (taken from the backend's ProblemDetails) on failure.
 */
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const message =
        problem?.detail || problem?.title || `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
};

/**
 * Same as apiFetch but attaches the current access token. If the request
 * comes back as 401 and a refresh token is available, it transparently
 * refreshes the access token once and retries the original request.
 */
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = tokenStorage.getAccessToken();

  const run = (accessToken: string | null) =>
      fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          ...options.headers,
        },
      });

  let response = await run(token);

  if (response.status === 401) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const tokens = await authAPI.refresh(refreshToken);
        tokenStorage.setTokens(tokens);
        response = await run(tokens.accessToken);
      } catch {
        tokenStorage.clearTokens();
      }
    }
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const message =
        problem?.detail || problem?.title || `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
};

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

// Backend UserRole enum: User = 0, Admin = 1.
const mapBackendRole = (role: number | BackendRole): BackendRole => {
  if (role === 1 || role === 'Admin') return 'Admin';
  return 'User';
};

export const mapUserDto = (dto: any): User => {
  const backendRole = mapBackendRole(dto.role);
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    name: `${dto.firstName} ${dto.lastName}`.trim(),
    dateOfBirth: dto.dateOfBirth,
    dataPermission: dto.dataPermission,
    backendRole,
    role: backendRole === 'Admin' ? 'teacher' : 'student',
  };
};

// ---------------------------------------------------------------------------
// Authentication API -> backend/src/MedApp.API/Controllers/AuthController.cs
// ---------------------------------------------------------------------------
export const authAPI = {
  // POST /api/auth/register
  register: async (payload: RegisterPayload): Promise<AuthTokens> => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /api/auth/login
  login: async (email: string, password: string): Promise<AuthTokens> => {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // POST /api/auth/refresh
  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    return apiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  // POST /api/auth/logout (requires auth)
  logout: async (refreshToken: string): Promise<void> => {
    await authenticatedFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  // GET /api/auth/me (requires auth)
  getCurrentUser: async (): Promise<User> => {
    const dto = await authenticatedFetch('/auth/me');
    return mapUserDto(dto);
  },
};

// Teacher Analytics API
export const teacherAPI = {
  getClassAnalytics: async () => {
    // TODO: Uncomment and connect to your backend
    // return authenticatedFetch('/teacher/analytics');

    // Mock response - remove this when connecting to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      totalStudents: 45,
      averageCompletionRate: 73,
      studentsAtRisk: 8,
      activeSubjects: 12,
      weeklyEngagement: [
        { week: 'Week 1', avgStudyHours: 18, avgCompletionRate: 75 },
        { week: 'Week 2', avgStudyHours: 20, avgCompletionRate: 78 },
        { week: 'Week 3', avgStudyHours: 17, avgCompletionRate: 70 },
        { week: 'Week 4', avgStudyHours: 22, avgCompletionRate: 82 },
        { week: 'Week 5', avgStudyHours: 19, avgCompletionRate: 76 },
      ],
      subjectPerformance: [
        { subject: 'Anatomy', avgKnowledge: 72, studentsStruggling: 5 },
        { subject: 'Physiology', avgKnowledge: 68, studentsStruggling: 8 },
        { subject: 'Biochemistry', avgKnowledge: 58, studentsStruggling: 12 },
        { subject: 'Pharmacology', avgKnowledge: 75, studentsStruggling: 4 },
      ],
    };
  },
};

// Student Data Sync API (for future use)
export const syncAPI = {
  syncSubjects: async (subjects: any[]) => {
    console.log('Sync subjects to backend:', subjects);
  },

  syncTopics: async (topics: any[]) => {
    console.log('Sync topics to backend:', topics);
  },

  syncActivities: async (activities: any[]) => {
    console.log('Sync activities to backend:', activities);
  },

  fetchUserData: async () => {
    return {
      subjects: [],
      topics: [],
      activities: [],
    };
  },
};

export default {
  auth: authAPI,
  teacher: teacherAPI,
  sync: syncAPI,
};