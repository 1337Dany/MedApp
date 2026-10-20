// Mirrors MedApp.Services.DTOs (Users/UserDto, Auth/TokenResponse, Auth/RegisterRequest).
// The backend sends enums as camelCase strings.

export type BackendRole = 'user' | 'teacher' | 'admin';

// UI role: backend "user" accounts are students.
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** `${firstName} ${lastName}` */
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  dataPermission: boolean;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  tokenType: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  email: string;
  password: string;
  dataPermission: boolean;
}

/** Teachers and admins see the aggregated class views instead of the student planner. */
export const isStaff = (user: User | null | undefined): boolean =>
  user?.role === 'teacher' || user?.role === 'admin';
