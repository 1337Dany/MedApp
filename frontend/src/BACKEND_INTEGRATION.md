# Backend Integration Guide

This document explains how to connect the authentication system to your backend API.

## Authentication Flow

The application uses a frontend authentication store (`/store/useAuthStore.ts`) with placeholder functions ready for backend integration.

### Files to Modify

#### 1. `/store/useAuthStore.ts`

This file contains the authentication logic with TODO comments marking where to add your backend API calls.

**Current State:** Mock authentication with localStorage persistence  
**Required:** Replace mock logic with actual API calls

#### 2. Key Integration Points

##### Login Function
```typescript
login: async (email: string, password: string) => {
  set({ isLoading: true });
  
  try {
    // TODO: Replace with actual backend API call
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    const user: User = data.user; // Adjust based on your API response
    
    set({ user, isAuthenticated: true, isLoading: false });
    
    // Store auth token if using JWT
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
}
```

##### Register Function
```typescript
register: async (email: string, password: string, name: string, role: 'student' | 'teacher') => {
  set({ isLoading: true });
  
  try {
    // TODO: Replace with actual backend API call
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    const data = await response.json();
    const user: User = data.user;
    
    set({ user, isAuthenticated: true, isLoading: false });
    
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
}
```

##### Logout Function
```typescript
logout: async () => {
  try {
    // TODO: Replace with actual backend API call
    await fetch('/api/auth/logout', { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  set({ user: null, isAuthenticated: false });
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}
```

### API Requirements

Your backend API should provide the following endpoints:

#### POST /api/auth/register
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "student" | "teacher"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "student",
    "createdAt": "2026-02-09T10:00:00Z"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/login
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "student",
    "createdAt": "2026-02-09T10:00:00Z"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/logout
**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Token Management

If using JWT tokens:

1. Store the token in localStorage after successful login/register
2. Include the token in the Authorization header for all authenticated requests
3. Implement token refresh logic if needed
4. Clear the token on logout

### Error Handling

Add proper error handling in the auth store:

```typescript
try {
  const response = await fetch('/api/auth/login', { ... });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Authentication failed');
  }
  
  // Success handling...
} catch (error) {
  set({ isLoading: false });
  
  // Show error to user
  if (error instanceof Error) {
    // Display error.message in UI
  }
  
  throw error;
}
```

### Session Persistence

The current implementation stores user data in localStorage. For production:

1. **Option 1: JWT in localStorage**
   - Simple implementation
   - Vulnerable to XSS attacks
   - Good for demo/development

2. **Option 2: HTTP-only cookies**
   - More secure
   - Requires backend to set cookies
   - Protects against XSS

3. **Option 3: Session storage + refresh tokens**
   - Balance of security and UX
   - Short-lived access tokens
   - Refresh tokens in HTTP-only cookies

### Protected Routes

All authenticated API calls should include the auth token:

```typescript
const response = await fetch('/api/protected-endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json',
  },
});
```

### Teacher Dashboard Data

For the teacher dashboard (`/components/TeacherDashboard.tsx`), you'll need to create an API endpoint that returns aggregated, anonymized student data:

#### GET /api/teacher/analytics
**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalStudents": 45,
  "averageCompletionRate": 73,
  "studentsAtRisk": 8,
  "activeSubjects": 12,
  "weeklyEngagement": [...],
  "subjectPerformance": [...]
}
```

**Important:** Ensure all data is properly anonymized before sending to the frontend.

## Testing

Before connecting to production:

1. Test with a development API endpoint
2. Verify error handling for all failure cases
3. Test session persistence across page refreshes
4. Verify logout clears all stored data
5. Test role-based access (student vs teacher views)

## Security Considerations

1. **Never store passwords in localStorage**
2. **Use HTTPS in production**
3. **Implement rate limiting on auth endpoints**
4. **Validate all inputs on the backend**
5. **Use secure password hashing (bcrypt, argon2)**
6. **Implement CSRF protection if using cookies**
7. **Add email verification for new accounts**
8. **Implement password reset functionality**

## Current Mock Behavior

The current implementation:
- Accepts any email/password combination
- Creates a mock user with the provided information
- Stores user data in localStorage
- Persists login across page refreshes

This is useful for development and UI testing but should be replaced with real authentication before production deployment.
