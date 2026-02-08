import { AlertTriangle, Calendar, Book, CheckCircle2, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useMemo, useState } from 'react';
import { QuickActions } from './QuickActions';
import { SubjectModal } from './SubjectModal';
import { ActivityModal } from './ActivityModal';

export function Dashboard() {
  const { activities, subjects, topics } = useStore();
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayActivities = activities.filter((a) => {
      const activityDate = new Date(a.startTime);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    });

    const completedToday = todayActivities.filter((a) => a.status === 'done').length;
    
    const upcomingExams = subjects
      .filter((s) => s.examDate && new Date(s.examDate) > new Date())
      .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime())
      .slice(0, 3);

    const knowledgeStats = {
      green: topics.filter((t) => t.knowledge === 'green').length,
      yellow: topics.filter((t) => t.knowledge === 'yellow').length,
      red: topics.filter((t) => t.knowledge === 'red').length,
    };

    const urgentSubjects = subjects.filter((s) => s.mode === 'emergency' || s.mode === 'determined');

    return {
      todayActivities: todayActivities.length,
      completedToday,
      upcomingExams,
      knowledgeStats,
      urgentSubjects,
      totalTopics: topics.length,
    };
  }, [activities, subjects, topics]);

  const getKnowledgePercentage = (count: number) => {
    return stats.totalTopics > 0 ? Math.round((count / stats.totalTopics) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Overview of your study schedule and progress</p>
      </div>

      {/* Warnings */}
      {stats.urgentSubjects.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Attention Required</h3>
              <p className="text-sm text-amber-700 mt-1">
                You have {stats.urgentSubjects.length} subject{stats.urgentSubjects.length > 1 ? 's' : ''} in urgent mode
              </p>
              <ul className="mt-2 space-y-1">
                {stats.urgentSubjects.map((subject) => (
                  <li key={subject.id} className="text-sm text-amber-800">
                    • {subject.title} ({subject.mode})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Activities</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {stats.completedToday}/{stats.todayActivities}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Subjects</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{subjects.length}</p>
            </div>
            <Book className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Topics</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.totalTopics}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Well Known</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {getKnowledgePercentage(stats.knowledgeStats.green)}%
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-green-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Knowledge Distribution</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Well Known (Green)</span>
              <span className="text-sm font-medium text-gray-900">{stats.knowledgeStats.green} topics</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${getKnowledgePercentage(stats.knowledgeStats.green)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Partially Known (Yellow)</span>
              <span className="text-sm font-medium text-gray-900">{stats.knowledgeStats.yellow} topics</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all"
                style={{ width: `${getKnowledgePercentage(stats.knowledgeStats.yellow)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Needs Work (Red)</span>
              <span className="text-sm font-medium text-gray-900">{stats.knowledgeStats.red} topics</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${getKnowledgePercentage(stats.knowledgeStats.red)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Exams */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Upcoming Exams</h3>
        {stats.upcomingExams.length > 0 ? (
          <div className="space-y-3">
            {stats.upcomingExams.map((subject) => {
              const daysUntil = Math.ceil(
                (new Date(subject.examDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{subject.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(subject.examDate!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{daysUntil} days</p>
                    <p className="text-xs text-gray-600 capitalize">{subject.mode} mode</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No upcoming exams scheduled</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
        <QuickActions
          onAddSubject={() => setIsSubjectModalOpen(true)}
          onAddActivity={() => setIsActivityModalOpen(true)}
          onViewCalendar={() => setShowCalendar(true)}
        />
      </div>

      {/* Subject Modal */}
      {isSubjectModalOpen && (
        <SubjectModal
          subject={null}
          onClose={() => setIsSubjectModalOpen(false)}
        />
      )}

      {/* Activity Modal */}
      {isActivityModalOpen && (
        <ActivityModal
          activity={null}
          onClose={() => setIsActivityModalOpen(false)}
        />
      )}
    </div>
  );
}