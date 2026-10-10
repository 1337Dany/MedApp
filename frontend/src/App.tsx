import { useEffect, useState } from 'react';
import { Calendar, Book, Activity as ActivityIcon, BarChart3, Users, UserCog } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { SubjectsView } from './components/SubjectsView';
import { ActivitiesView } from './components/ActivitiesView';
import { AnalyticsView } from './components/AnalyticsView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { InitialSetup } from './components/InitialSetup';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { UsersView } from './components/UsersView';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { isStaff } from './types/auth';

const setupKey = (userId: string) => `medapp.setupDone.${userId}`;
const isSetupDone = (userId: string) => localStorage.getItem(setupKey(userId)) === '1';
const markSetupDone = (userId: string) => localStorage.setItem(setupKey(userId), '1');

type View = 'dashboard' | 'calendar' | 'subjects' | 'activities' | 'analytics' | 'teacher' | 'users';

export default function App() {
  const { subjects, activities, isLoaded, loadError, loadAll, reset } = useStore();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const staff = isStaff(user);
  const [currentView, setCurrentView] = useState<View>(staff ? 'teacher' : 'dashboard');
  const [setupComplete, setSetupComplete] = useState(false);

  // Whenever a different user signs in (or out): drop the previous user's data, land on the
  // right start page and load the new user's data from the API.
  useEffect(() => {
    reset();
    setCurrentView(staff ? 'teacher' : 'dashboard');
    setSetupComplete(user ? isSetupDone(user.id) : false);
    if (user && !staff) loadAll();
  }, [user?.id, staff]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  if (!staff && !isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        {loadError ? (
          <>
            <p className="text-red-700">{loadError}</p>
            <button onClick={() => loadAll()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Try again
            </button>
          </>
        ) : (
          <p className="text-gray-500">Loading your data...</p>
        )}
      </div>
    );
  }

  // First visit of a student with an empty account: offer demo data (shown until dismissed once).
  if (!staff && user && subjects.length === 0 && activities.length === 0 && !setupComplete) {
    return (
      <InitialSetup
        onComplete={() => {
          markSetupDone(user.id);
          setSetupComplete(true);
        }}
      />
    );
  }

  // Navigation items based on role. Staff have no study data of their own.
  const navigation = staff
    ? [
        { id: 'teacher' as const, label: 'Class Overview', icon: Users },
        ...(user?.role === 'admin' ? [{ id: 'users' as const, label: 'Users', icon: UserCog }] : []),
      ]
    : [
        { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
        { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
        { id: 'subjects' as const, label: 'Subjects', icon: Book },
        { id: 'activities' as const, label: 'Activities', icon: ActivityIcon },
        { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Book className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">MedStudy Planner</h1>
            </div>
            <UserProfile />
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === item.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {staff && currentView === 'teacher' && <TeacherDashboard />}
          {user?.role === 'admin' && currentView === 'users' && <UsersView />}
          {!staff && currentView === 'dashboard' && <Dashboard onViewCalendar={() => setCurrentView('calendar')} />}
          {!staff && currentView === 'calendar' && <CalendarView />}
          {!staff && currentView === 'subjects' && <SubjectsView />}
          {!staff && currentView === 'activities' && <ActivitiesView />}
          {!staff && currentView === 'analytics' && <AnalyticsView />}
        </main>
      </div>
    </div>
  );
}