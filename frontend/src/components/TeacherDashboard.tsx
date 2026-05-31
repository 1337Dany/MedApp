import { Users, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export function TeacherDashboard() {
  // Mock aggregated student data
  const mockStudentData = {
    totalStudents: 45,
    averageCompletionRate: 73,
    studentsAtRisk: 8,
    activeSubjects: 12,
  };

  // Mock weekly engagement data
  const weeklyEngagement = [
    { week: 'Week 1', avgStudyHours: 18, avgCompletionRate: 75 },
    { week: 'Week 2', avgStudyHours: 20, avgCompletionRate: 78 },
    { week: 'Week 3', avgStudyHours: 17, avgCompletionRate: 70 },
    { week: 'Week 4', avgStudyHours: 22, avgCompletionRate: 82 },
    { week: 'Week 5', avgStudyHours: 19, avgCompletionRate: 76 },
  ];

  // Mock subject performance data
  const subjectPerformance = [
    { subject: 'Anatomy', avgKnowledge: 72, studentsStruggling: 5 },
    { subject: 'Physiology', avgKnowledge: 68, studentsStruggling: 8 },
    { subject: 'Biochemistry', avgKnowledge: 58, studentsStruggling: 12 },
    { subject: 'Pharmacology', avgKnowledge: 75, studentsStruggling: 4 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Teacher Dashboard</h2>
        <p className="text-gray-600 mt-1">Aggregated, anonymized student insights</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Anonymous Analytics</h3>
            <p className="text-sm text-blue-700 mt-1">
              All data shown is aggregated and anonymized. Individual student identities are protected.
              This view helps you understand class-wide patterns and identify areas needing attention.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {mockStudentData.totalStudents}
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
                {mockStudentData.averageCompletionRate}%
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
                {mockStudentData.studentsAtRisk}
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
                {mockStudentData.activeSubjects}
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
          <LineChart data={weeklyEngagement}>
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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={subjectPerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subject" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgKnowledge" fill="#3b82f6" name="Avg Knowledge %" />
            <Bar dataKey="studentsStruggling" fill="#f59e0b" name="Students Struggling" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Insights & Recommendations</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
            <div>
              <p className="text-sm font-medium text-amber-900">Biochemistry Needs Attention</p>
              <p className="text-xs text-amber-700 mt-1">
                12 students are struggling with Biochemistry topics. Consider additional review sessions
                or supplementary materials for Glycolysis, Krebs Cycle, and related metabolic pathways.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
            <div>
              <p className="text-sm font-medium text-green-900">Strong Pharmacology Performance</p>
              <p className="text-xs text-green-700 mt-1">
                Students are performing well in Pharmacology with 75% average knowledge retention.
                Current teaching methods are effective.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">Completion Rate Trend</p>
              <p className="text-xs text-blue-700 mt-1">
                Average completion rate has increased by 7% over the last month, indicating improved
                time management and engagement among students.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
            <div>
              <p className="text-sm font-medium text-red-900">At-Risk Students</p>
              <p className="text-xs text-red-700 mt-1">
                8 students show patterns of low completion rates (&lt;60%) and multiple red topics.
                Early intervention recommended through office hours or tutoring support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Connection Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Backend Integration:</span> This teacher dashboard displays mock data.
          Connect to your backend API in a new service file to fetch real aggregated student analytics.
          Ensure all data is properly anonymized before transmission.
        </p>
      </div>
    </div>
  );
}
