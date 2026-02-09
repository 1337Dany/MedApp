# Quick Backend Connection Guide

## Step 1: Set Your API URL

Create a `.env` file in your project root:

```bash
REACT_APP_API_URL=https://your-backend-api.com/api
```

## Step 2: Update API Service

Open `/services/api.ts` and uncomment the API calls. Here's what to change:

### Login Function
**Find this:**
```typescript
login: async (email: string, password: string) => {
  // TODO: Uncomment and connect to your backend
  // return authenticatedFetch('/auth/login', {
  //   method: 'POST',
  //   body: JSON.stringify({ email, password }),
  // });

  // Mock response - remove this when connecting to backend
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { ... };
}
```

**Replace with:**
```typescript
login: async (email: string, password: string) => {
  return authenticatedFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
```

### Register Function
**Find this:**
```typescript
register: async (email: string, password: string, name: string, role: 'student' | 'teacher') => {
  // TODO: Uncomment and connect to your backend
  // return authenticatedFetch('/auth/register', {
  //   method: 'POST',
  //   body: JSON.stringify({ email, password, name, role }),
  // });

  // Mock response - remove this when connecting to backend
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { ... };
}
```

**Replace with:**
```typescript
register: async (email: string, password: string, name: string, role: 'student' | 'teacher') => {
  return authenticatedFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role }),
  });
}
```

### Logout Function
**Find this:**
```typescript
logout: async () => {
  // TODO: Uncomment and connect to your backend
  // return authenticatedFetch('/auth/logout', { method: 'POST' });

  // Mock response - remove this when connecting to backend
  await new Promise(resolve => setTimeout(resolve, 500));
  return { message: 'Logged out successfully' };
}
```

**Replace with:**
```typescript
logout: async () => {
  return authenticatedFetch('/auth/logout', { method: 'POST' });
}
```

### Teacher Analytics
**Find this:**
```typescript
getClassAnalytics: async () => {
  // TODO: Uncomment and connect to your backend
  // return authenticatedFetch('/teacher/analytics');

  // Mock response - remove this when connecting to backend
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { ... };
}
```

**Replace with:**
```typescript
getClassAnalytics: async () => {
  return authenticatedFetch('/teacher/analytics');
}
```

## Step 3: Required Backend Endpoints

Your backend must implement these endpoints:

### 1. POST /api/auth/register
```json
// Request
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "student"
}

// Response
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

### 2. POST /api/auth/login
```json
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
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

### 3. POST /api/auth/logout
```json
// Request Headers
Authorization: Bearer <token>

// Response
{
  "message": "Logged out successfully"
}
```

### 4. GET /api/teacher/analytics (Teachers only)
```json
// Request Headers
Authorization: Bearer <token>

// Response
{
  "totalStudents": 45,
  "averageCompletionRate": 73,
  "studentsAtRisk": 8,
  "activeSubjects": 12,
  "weeklyEngagement": [...],
  "subjectPerformance": [...]
}
```

## Step 4: Test the Connection

1. Start your backend server
2. Update the `.env` file with your backend URL
3. Restart your React development server
4. Try to register a new account
5. Check browser console for any errors
6. Verify the token is being stored in localStorage

## Troubleshooting

### CORS Issues
If you see CORS errors, configure your backend to allow requests from your frontend:

**Express.js example:**
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));
```

### Authentication Token Not Sent
The token is automatically included in all authenticated requests via the `authenticatedFetch` helper function in `/services/api.ts`.

### Wrong API URL
Check:
1. `.env` file has correct URL (with `/api` at the end)
2. Development server was restarted after changing `.env`
3. No typos in the URL

### 401 Unauthorized
- Token might be expired
- Check if backend is validating the token correctly
- Verify token is being sent in Authorization header

## Visual Feedback

The auth modal will automatically update the status indicator from:
- 🟠 "Backend Status: Mock Mode" (before connection)
- 🟢 "Backend Status: Connected" (after successful connection - you can implement this)

## Complete Example

**1. Create `.env`:**
```bash
REACT_APP_API_URL=http://localhost:3001/api
```

**2. Update `/services/api.ts`:**
Remove all mock responses and uncomment the API calls.

**3. Start servers:**
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm start
```

**4. Test:**
- Open http://localhost:3000
- Register a new account
- Check backend logs for the API call
- Verify login works
- Test logout

That's it! Your authentication is now connected to the backend. 🎉
