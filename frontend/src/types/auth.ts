// These types mirror the backend DTOs:
// - MedApp.Services.DTOs.Users.UserDto
// - MedApp.Services.DTOs.Auth.TokenResponse
// - MedApp.Services.DTOs.Auth.RegisterRequest

// Backend role enum (MedApp.Models.Models.Enums.UserRole): User = 0, Admin = 1.
// The UI was originally built around 'student' / 'teacher'. We map
// User -> 'student' and Admin -> 'teacher' so the rest of the app
// (navigation, dashboards, etc.) keeps working unchanged.
export type BackendRole = 'User' | 'Admin';
export type UiRole = 'student' | 'teacher';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Convenience field: `${firstName} ${lastName}` */
  name: string;
  dateOfBirth: string; // ISO date (YYYY-MM-DD)
  dataPermission: boolean;
  backendRole: BackendRole;
  /** Mapped from backendRole for compatibility with existing UI logic */
  role: UiRole;
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