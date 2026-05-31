// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper function for authenticated requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

// Authentication API
export const authAPI = {
  login: async (email: string, password: string) => {
    // TODO: Uncomment and connect to your backend
    // return authenticatedFetch('/auth/login', {
    //   method: 'POST',
    //   body: JSON.stringify({ email, password }),
    // });

    // Mock response - remove this when connecting to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      user: {
        id: crypto.randomUUID(),
        email,
        name: email.split('@')[0],
        role: 'student',
        createdAt: new Date(),
      },
      token: 'mock_jwt_token_' + Date.now(),
    };
  },

  register: async (email: string, password: string, name: string, role: 'student' | 'teacher') => {
    // TODO: Uncomment and connect to your backend
    // return authenticatedFetch('/auth/register', {
    //   method: 'POST',
    //   body: JSON.stringify({ email, password, name, role }),
    // });

    // Mock response - remove this when connecting to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      user: {
        id: crypto.randomUUID(),
        email,
        name,
        role,
        createdAt: new Date(),
      },
      token: 'mock_jwt_token_' + Date.now(),
    };
  },

  logout: async () => {
    // TODO: Uncomment and connect to your backend
    // return authenticatedFetch('/auth/logout', { method: 'POST' });

    // Mock response - remove this when connecting to backend
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Logged out successfully' };
  },

  getCurrentUser: async () => {
    // TODO: Uncomment and connect to your backend
    // return authenticatedFetch('/auth/me');

    // Mock response - remove this when connecting to backend
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return { user: JSON.parse(storedUser) };
    }
    throw new Error('Not authenticated');
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
  // Sync subjects to backend
  syncSubjects: async (subjects: any[]) => {
    // return authenticatedFetch('/sync/subjects', {
    //   method: 'POST',
    //   body: JSON.stringify({ subjects }),
    // });
    console.log('Sync subjects to backend:', subjects);
  },

  // Sync topics to backend
  syncTopics: async (topics: any[]) => {
    // return authenticatedFetch('/sync/topics', {
    //   method: 'POST',
    //   body: JSON.stringify({ topics }),
    // });
    console.log('Sync topics to backend:', topics);
  },

  // Sync activities to backend
  syncActivities: async (activities: any[]) => {
    // return authenticatedFetch('/sync/activities', {
    //   method: 'POST',
    //   body: JSON.stringify({ activities }),
    // });
    console.log('Sync activities to backend:', activities);
  },

  // Fetch user data from backend
  fetchUserData: async () => {
    // return authenticatedFetch('/sync/user-data');
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
