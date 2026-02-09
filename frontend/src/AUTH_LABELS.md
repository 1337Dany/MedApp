# Authentication Labels & Components

This document lists all authentication-related UI components and labels that are ready for backend integration.

## 🎨 Authentication UI Components

### 1. Login/Register Modal (`/components/AuthModal.tsx`)
**Purpose:** Handles user authentication (login/register)

**Labels & Fields:**
- **Modal Title (Login):** "Sign In"
- **Modal Title (Register):** "Create Account"
- **Full Name Field:** "Full Name *" (register only)
- **Role Selection:** "I am a *"
  - Button: "Student"
  - Button: "Teacher"
- **Email Field:** "Email Address *"
- **Password Field:** "Password *"
- **Password Hint:** "Minimum 6 characters" (register only)
- **Submit Button (Login):** "Sign In"
- **Submit Button (Register):** "Create Account"
- **Loading State:** "Please wait..."
- **Toggle Link (Login):** "Don't have an account? Sign up"
- **Toggle Link (Register):** "Already have an account? Sign in"
- **Error Message:** "Authentication failed. Please try again."
- **Required Field Error:** "Name is required"

**Backend Status Indicator:**
- Amber dot + "Backend Status: Mock Mode"
- Integration instructions visible to users

### 2. User Profile Dropdown (`/components/UserProfile.tsx`)
**Purpose:** Displays logged-in user information and actions

**Labels:**
- **User Avatar:** First letter of user's name (uppercase)
- **User Name:** Display name from user object
- **User Role:** "student" or "teacher" (capitalized)
- **Menu Items:**
  - "Profile Settings" (with User icon)
  - "Preferences" (with Settings icon)
  - "Sign Out" (with Logout icon, red color)
- **Footer Note:** Integration status message

**User Data Structure:**
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher';
  createdAt: Date;
}
```

### 3. Initial Setup Screen (`/components/InitialSetup.tsx`)
**Labels:**
- **Welcome Title:** "Welcome to MedStudy Planner"
- **Subtitle:** "A sustainable approach to medical student life management"
- **Features:**
  - "Smart Scheduling" - "Automatically plan study time based on exams..."
  - "Multiple Study Strategies" - "Choose between Manual, Traffic Light, or Active Recall..."
  - "Wellbeing Tracking" - "Monitor your workload and receive warnings..."
- **Action Buttons:**
  - "Start with Demo Data"
  - "Start Fresh"
- **Loading State:** "Loading Demo Data..."
- **Footer Note:** Demo data description

## 🔐 Authentication Types

### User Interface (`/types/auth.ts`)
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher';
  createdAt: Date;
}
```

### Auth State Interface
```typescript
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

## 🔌 Backend Integration Points

### API Service (`/services/api.ts`)

**Authentication Endpoints:**
1. **Login:** `POST /api/auth/login`
2. **Register:** `POST /api/auth/register`
3. **Logout:** `POST /api/auth/logout`
4. **Get Current User:** `GET /api/auth/me`

**Teacher Endpoints:**
1. **Class Analytics:** `GET /api/teacher/analytics`

**Data Sync Endpoints:**
1. **Sync Subjects:** `POST /api/sync/subjects`
2. **Sync Topics:** `POST /api/sync/topics`
3. **Sync Activities:** `POST /api/sync/activities`
4. **Fetch User Data:** `GET /api/sync/user-data`

### Auth Store (`/store/useAuthStore.ts`)

**Methods Ready for Backend:**
- `login(email, password)` - Connect to login endpoint
- `register(email, password, name, role)` - Connect to register endpoint
- `logout()` - Connect to logout endpoint
- `setUser(user)` - Internal state management

**Storage:**
- `localStorage.setItem('authToken', token)` - JWT token storage
- `localStorage.setItem('user', JSON.stringify(user))` - User data cache
- `localStorage.removeItem('authToken')` - Token cleanup on logout
- `localStorage.removeItem('user')` - User data cleanup on logout

## 📝 Form Validation Labels

### Email Validation
- **Pattern:** Standard email format validation
- **Required:** Yes
- **Error Message:** Browser default or custom "Please enter a valid email"

### Password Validation
- **Min Length:** 6 characters
- **Required:** Yes
- **Error Message:** Browser default or custom "Password must be at least 6 characters"

### Name Validation (Register)
- **Required:** Yes
- **Error Message:** "Name is required"

### Role Selection (Register)
- **Options:** "Student" | "Teacher"
- **Required:** Yes (defaults to "student")

## 🎭 Role-Based UI

### Student Role
**Navigation:**
- Dashboard
- Calendar
- Subjects
- Activities
- Analytics

**Features:**
- Full app functionality
- Personal study planning
- Topic management
- Activity scheduling

### Teacher Role
**Navigation:**
- Class Overview
- Analytics

**Features:**
- Aggregated student analytics
- Anonymized insights
- Performance tracking
- Risk identification

**Initial Setup:** Skipped for teachers

## 🎨 Visual Indicators

### Authentication Status
- **Logged Out:** Shows AuthModal (blocking)
- **Logged In:** Shows main app with UserProfile in header
- **Loading:** "Please wait..." on submit buttons

### Backend Connection Status
- **Mock Mode:** Amber dot (🟠) + "Backend Status: Mock Mode"
- **Connected:** (To be implemented) Green dot + "Backend Status: Connected"
- **Error:** (To be implemented) Red dot + "Backend Status: Error"

## 🔄 User Flow

### New User (Student)
1. See AuthModal
2. Click "Don't have an account? Sign up"
3. Enter name, email, password
4. Select role: "Student"
5. Click "Create Account"
6. Redirect to Initial Setup
7. Choose "Start with Demo Data" or "Start Fresh"
8. Access main app

### New User (Teacher)
1. See AuthModal
2. Click "Don't have an account? Sign up"
3. Enter name, email, password
4. Select role: "Teacher"
5. Click "Create Account"
6. Direct access to Teacher Dashboard

### Returning User
1. See AuthModal
2. Enter email and password
3. Click "Sign In"
4. Access appropriate dashboard based on role

### Logout
1. Click user avatar in header
2. Click "Sign Out"
3. Redirect to AuthModal
4. Clear all stored credentials

## 📊 Teacher Dashboard Labels

### Stats Cards
- "Total Students" - Number of students
- "Avg Completion Rate" - Percentage
- "Students at Risk" - Count
- "Active Subjects" - Count

### Charts
- "Class Engagement Trends" - Line chart
- "Subject Performance Overview" - Bar chart

### Insights Section
- "Insights & Recommendations"
- Color-coded insight cards (amber, green, blue, red)

### Info Banner
- "Anonymous Analytics"
- "All data shown is aggregated and anonymized..."

## 🔒 Security Considerations

**Client-Side:**
- Password minimum length: 6 characters
- Email format validation
- Password field type: "password" (masked)
- Token storage in localStorage (ready for HTTP-only cookies)
- Clear credentials on logout

**Backend Requirements:**
- Password hashing (bcrypt/argon2)
- JWT token generation
- HTTPS only in production
- Rate limiting on auth endpoints
- Email verification (optional)
- CSRF protection (if using cookies)

## 📦 Files Modified for Auth

1. `/App.tsx` - Auth check, role-based rendering
2. `/components/AuthModal.tsx` - Login/register UI
3. `/components/UserProfile.tsx` - User dropdown
4. `/components/TeacherDashboard.tsx` - Teacher-specific view
5. `/store/useAuthStore.ts` - Auth state management
6. `/services/api.ts` - API integration layer
7. `/types/auth.ts` - TypeScript interfaces
8. `/.env.example` - Environment configuration

## ✅ Testing Checklist

- [ ] Login with valid credentials
- [ ] Register new student account
- [ ] Register new teacher account
- [ ] Role-based navigation (student vs teacher)
- [ ] Logout clears all data
- [ ] Session persistence (reload page while logged in)
- [ ] Error handling for failed authentication
- [ ] Loading states during API calls
- [ ] Form validation (required fields, email format, password length)
- [ ] Teacher dashboard displays mock data
- [ ] Student sees initial setup on first login

## 🚀 Next Steps

1. Set up backend API endpoints
2. Update `REACT_APP_API_URL` in `.env`
3. Uncomment API calls in `/services/api.ts`
4. Test with real authentication
5. Implement email verification (optional)
6. Add password reset functionality
7. Set up proper error handling
8. Implement token refresh mechanism
9. Add logging and monitoring
10. Security audit before production
