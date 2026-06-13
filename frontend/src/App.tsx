import { useState } from 'react';
import { Calendar, Book, Activity as ActivityIcon, BarChart3, Settings, Users } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { SubjectsView } from './components/SubjectsView';
import { ActivitiesView } from './components/ActivitiesView';
import { AnalyticsView } from './components/AnalyticsView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { InitialSetup } from './components/InitialSetup';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';

type View = 'dashboard' | 'calendar' | 'subjects' | 'activities' | 'analytics' | 'teacher';

export default function App() {
  const { subjects } = useStore();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [currentView, setCurrentView] = useState<View>(user?.role === 'teacher' ? 'teacher' : 'dashboard');
  const [setupComplete, setSetupComplete] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show auth modal if not authenticated
  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Loading...</p>
        </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal onClose={() => setShowAuthModal(false)} />;
  }

  // Show initial setup if no subjects exist and setup not completed (only for students)
  if (user?.role === 'student' && subjects.length === 0 && !setupComplete) {
    return <InitialSetup onComplete={() => setSetupComplete(true)} />;
  }

  // Navigation items based on role
  const navigation = user?.role === 'teacher' 
    ? [
        { id: 'teacher' as const, label: 'Class Overview', icon: Users },
        { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
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
          {user?.role === 'teacher' && currentView === 'teacher' && <TeacherDashboard />}
          {user?.role === 'student' && currentView === 'dashboard' && <Dashboard />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'subjects' && <SubjectsView />}
          {currentView === 'activities' && <ActivitiesView />}
          {currentView === 'analytics' && <AnalyticsView />}
        </main>
      </div>
    </div>
  );
}