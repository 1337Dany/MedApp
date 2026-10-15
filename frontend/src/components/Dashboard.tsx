import { AlertTriangle, Calendar, Book, CheckCircle2, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useMemo, useState } from 'react';
import { QuickActions } from './QuickActions';
import { SubjectModal } from './SubjectModal';
import { ActivityModal } from './ActivityModal';
import { addDays, startOfDay } from '../utils/dates';
import { expandOccurrences } from '../utils/recurrence';

interface DashboardProps {
  onViewCalendar: () => void;
}

const SEVERITY_STYLES = {
  high: { box: 'bg-red-50 border-red-200', title: 'text-red-900', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { box: 'bg-amber-50 border-amber-200', title: 'text-amber-900', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { box: 'bg-blue-50 border-blue-200', title: 'text-blue-900', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export function Dashboard({ onViewCalendar }: DashboardProps) {
  const { activities, subjects, topics, warnings, generatePlan } = useStore();
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [planDays, setPlanDays] = useState(7);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planMessage, setPlanMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const plannedAhead = activities.filter(
    (a) => a.autoPlanned && a.status === 'scheduled' && new Date(a.startTime) > new Date(),
  ).length;

  const planWeek = async (days = planDays) => {
    setIsPlanning(true);
    setPlanMessage(null);
    try {
      const count = await generatePlan(days);
      setPlanMessage({
        ok: true,
        text: count > 0
          ? `Planned ${count} study session${count === 1 ? '' : 's'} for the next ${days} days.`
          : 'Nothing to plan: add a subject with the Traffic Light or Active Recall strategy and an upcoming exam.',
      });
    } catch (err) {
      setPlanMessage({ ok: false, text: err instanceof Error ? err.message : 'Planning failed.' });
    } finally {
      setIsPlanning(false);
    }
  };

  const stats = useMemo(() => {
    const today = startOfDay(new Date());

    // Includes today's occurrences of recurring activities.
    const todayActivities = expandOccurrences(activities, today, addDays(today, 1));

    const completedToday = todayActivities.filter((o) => o.activity.status === 'done').length;
    
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

      {/* Workload warnings from the planner (docs/PLANNING.md) */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, index) => {
            const style = SEVERITY_STYLES[warning.severity];
            return (
              <div key={index} className={`border rounded-lg p-4 ${style.box}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${style.dot}`} />
                  <div>
                    <p className={`text-sm font-medium ${style.title}`}>{warning.message}</p>
                    {warning.suggestions.length > 0 && (
                      <ul className={`mt-1 space-y-0.5 text-xs ${style.text}`}>
                        {warning.suggestions.map((suggestion) => (
                          <li key={suggestion}>• {suggestion}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Study planner */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">Study Planner</h3>
              <p className="text-sm text-gray-600 mt-1">
                {plannedAhead > 0
                  ? `${plannedAhead} planned session${plannedAhead === 1 ? '' : 's'} ahead. The plan updates itself when you rate topics or finish sessions.`
                  : 'Fill free time with study sessions based on your subjects, topics and exams.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={planDays}
              onChange={(e) => setPlanDays(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Next 7 days</option>
              <option value={14}>Next 14 days</option>
              <option value={28}>Next 28 days</option>
            </select>
            <button
              onClick={() => planWeek()}
              disabled={isPlanning}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPlanning ? 'Planning...' : plannedAhead > 0 ? 'Re-plan' : 'Plan Sessions'}
            </button>
          </div>
        </div>
        {planMessage && (
          <p className={`mt-3 text-sm ${planMessage.ok ? 'text-green-700' : 'text-red-700'}`}>{planMessage.text}</p>
        )}
      </div>

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
          onViewCalendar={onViewCalendar}
          onPlanWeek={() => planWeek(7)}
          isPlanning={isPlanning}
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