import { useEffect, useState } from 'react';
import { Users, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';
import { ClassAnalytics, teacherAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Insight {
  tone: 'amber' | 'green' | 'blue' | 'red';
  title: string;
  text: string;
}

const INSIGHT_STYLES = {
  amber: ['bg-amber-50', 'bg-amber-500', 'text-amber-900', 'text-amber-700'],
  green: ['bg-green-50', 'bg-green-500', 'text-green-900', 'text-green-700'],
  blue: ['bg-blue-50', 'bg-blue-500', 'text-blue-900', 'text-blue-700'],
  red: ['bg-red-50', 'bg-red-500', 'text-red-900', 'text-red-700'],
};

// Plain-language observations derived from the aggregated numbers.
function buildInsights(data: ClassAnalytics): Insight[] {
  const insights: Insight[] = [];
  const subjects = [...data.subjectPerformance].sort((a, b) => a.avgKnowledge - b.avgKnowledge);

  const weakest = subjects[0];
  if (weakest && weakest.avgKnowledge < 60) {
    insights.push({
      tone: 'amber',
      title: `${weakest.subject} Needs Attention`,
      text: `Average knowledge is ${weakest.avgKnowledge}%, and ${weakest.studentsStruggling} of ${weakest.students} students rate most of their topics red. Consider an extra review session or supplementary materials.`,
    });
  }

  const strongest = subjects[subjects.length - 1];
  if (strongest && strongest !== weakest && strongest.avgKnowledge >= 70) {
    insights.push({
      tone: 'green',
      title: `Strong ${strongest.subject} Performance`,
      text: `Students report ${strongest.avgKnowledge}% average knowledge in ${strongest.subject}.`,
    });
  }

  const weeks = data.weeklyEngagement.filter((w) => w.avgCompletionRate > 0);
  if (weeks.length >= 2) {
    const change = weeks[weeks.length - 1].avgCompletionRate - weeks[0].avgCompletionRate;
    insights.push({
      tone: 'blue',
      title: 'Completion Rate Trend',
      text:
        change === 0
          ? 'The average completion rate is stable over the last weeks.'
          : `The average completion rate has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} percentage points since ${weeks[0].week.replace('Week of ', '')}.`,
    });
  }

  if (data.studentsAtRisk > 0) {
    insights.push({
      tone: 'red',
      title: 'At-Risk Students',
      text: `${data.studentsAtRisk} student${data.studentsAtRisk === 1 ? ' shows' : 's show'} a completion rate below 60% or mostly red topics. Office hours or tutoring could help.`,
    });
  }

  return insights;
}

export function TeacherDashboard() {
  const [data, setData] = useState<ClassAnalytics | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    teacherAPI
      .getClassAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load class analytics.'));
  };

  useEffect(load, []);

  const header = (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900">Teacher Dashboard</h2>
      <p className="text-gray-600 mt-1">Aggregated, anonymized student insights</p>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={load} className="px-3 py-1.5 text-sm bg-white border border-red-300 rounded-lg hover:bg-red-100">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-gray-500">Loading class analytics...</p>
      </div>
    );
  }

  const insights = buildInsights(data);

  return (
    <div className="space-y-6">
      {header}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Anonymous Analytics</h3>
            <p className="text-sm text-blue-700 mt-1">
              Only students who allowed data sharing are included, and only as aggregates. Groups smaller than{' '}
              {data.minimumGroupSize} students are never shown, so individual students cannot be identified.
            </p>
          </div>
        </div>
      </div>

      {data.insufficientData ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-700 font-medium">Not enough data yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Analytics appear once at least {data.minimumGroupSize} students share their data.
          </p>
        </div>
      ) : (
      <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {data.totalStudents}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Completion Rate</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {data.averageCompletionRate}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Students at Risk</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {data.studentsAtRisk}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Subjects</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {data.activeSubjects}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Weekly Engagement Trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Class Engagement Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.weeklyEngagement}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgStudyHours"
              stroke="#3b82f6"
              name="Avg Study Hours"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgCompletionRate"
              stroke="#10b981"
              name="Avg Completion %"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Subject Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Subject Performance Overview</h3>
        {data.subjectPerformance.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No subject is studied by at least {data.minimumGroupSize} sharing students yet.
          </p>
        ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.subjectPerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subject" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgKnowledge" fill="#3b82f6" name="Avg Knowledge %" />
            <Bar dataKey="studentsStruggling" fill="#f59e0b" name="Students Struggling" />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Insights & Recommendations</h3>
        {insights.length === 0 ? (
          <p className="text-sm text-gray-500">No notable patterns at the moment.</p>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const [box, dot, title, text] = INSIGHT_STYLES[insight.tone];
              return (
                <div key={insight.title} className={`flex items-start gap-3 p-3 rounded-lg ${box}`}>
                  <div className={`w-2 h-2 rounded-full mt-2 ${dot}`} />
                  <div>
                    <p className={`text-sm font-medium ${title}`}>{insight.title}</p>
                    <p className={`text-xs mt-1 ${text}`}>{insight.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
