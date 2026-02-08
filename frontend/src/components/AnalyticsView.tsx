import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function AnalyticsView() {
  const { activities, subjects, topics } = useStore();

  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = days.map((day, index) => {
      const dayActivities = activities.filter((a) => {
        const activityDate = new Date(a.startTime);
        return activityDate.getDay() === index && a.status === 'done';
      });

      const studyTime = dayActivities
        .filter((a) => a.type === 'studying')
        .reduce((sum, a) => sum + a.duration, 0);

      const restTime = dayActivities
        .filter((a) => a.type === 'rest' || a.type === 'sport')
        .reduce((sum, a) => sum + a.duration, 0);

      return {
        day,
        study: Math.round(studyTime / 60),
        rest: Math.round(restTime / 60),
      };
    });

    return data;
  }, [activities]);

  const subjectDistribution = useMemo(() => {
    const distribution = subjects.map((subject) => {
      const subjectActivities = activities.filter(
        (a) => a.subjectId === subject.id && a.status === 'done'
      );
      const totalTime = subjectActivities.reduce((sum, a) => sum + a.duration, 0);

      return {
        name: subject.title,
        value: Math.round(totalTime / 60),
        color: subject.color,
      };
    });

    return distribution.filter((d) => d.value > 0);
  }, [activities, subjects]);

  const knowledgeData = useMemo(() => {
    return [
      { name: 'Well Known', value: topics.filter((t) => t.knowledge === 'green').length, color: '#10b981' },
      { name: 'Partially Known', value: topics.filter((t) => t.knowledge === 'yellow').length, color: '#eab308' },
      { name: 'Needs Work', value: topics.filter((t) => t.knowledge === 'red').length, color: '#ef4444' },
    ];
  }, [topics]);

  const completionRate = useMemo(() => {
    const total = activities.length;
    if (total === 0) return 0;
    const completed = activities.filter((a) => a.status === 'done').length;
    return Math.round((completed / total) * 100);
  }, [activities]);

  const averageStudyTime = useMemo(() => {
    const studyActivities = activities.filter((a) => a.type === 'studying' && a.status === 'done');
    if (studyActivities.length === 0) return 0;
    const totalTime = studyActivities.reduce((sum, a) => sum + a.duration, 0);
    return Math.round(totalTime / studyActivities.length);
  }, [activities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Analytics</h2>
        <p className="text-gray-600 mt-1">Track your progress and study patterns</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Completion Rate</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">{completionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {activities.filter((a) => a.status === 'done').length} of {activities.length} activities
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Avg. Study Session</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">{averageStudyTime} min</p>
          <p className="text-xs text-gray-500 mt-1">Per study activity</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Topics Mastered</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {topics.filter((t) => t.knowledge === 'green').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Out of {topics.length} total topics</p>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Weekly Activity (Hours)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="study" fill="#3b82f6" name="Study Time" />
            <Bar dataKey="rest" fill="#10b981" name="Rest & Sport" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Distribution */}
        {subjectDistribution.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Study Time by Subject (Hours)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subjectDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}h`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subjectDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Knowledge Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Knowledge Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={knowledgeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {knowledgeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Insights & Recommendations</h3>
        <div className="space-y-3">
          {completionRate < 70 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Low Completion Rate</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your completion rate is {completionRate}%. Consider reviewing your schedule to ensure
                  it's realistic and achievable.
                </p>
              </div>
            </div>
          )}

          {topics.filter((t) => t.knowledge === 'red').length > topics.length * 0.3 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium text-red-900">Many Topics Need Attention</p>
                <p className="text-xs text-red-700 mt-1">
                  {topics.filter((t) => t.knowledge === 'red').length} topics need work. Consider
                  increasing study time or using the traffic light strategy.
                </p>
              </div>
            </div>
          )}

          {averageStudyTime > 120 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium text-blue-900">Long Study Sessions</p>
                <p className="text-xs text-blue-700 mt-1">
                  Your average study session is {averageStudyTime} minutes. Consider breaking them into
                  shorter sessions with breaks for better retention.
                </p>
              </div>
            </div>
          )}

          {activities.filter((a) => a.status === 'done').length === 0 && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-gray-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">Start Tracking</p>
                <p className="text-xs text-gray-700 mt-1">
                  Complete some activities to see meaningful analytics and insights.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
