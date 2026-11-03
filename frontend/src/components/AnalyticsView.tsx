import { useId, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../store/useStore';
import { useOccurrences } from '../hooks/useOccurrences';
import { StaleDataBanner } from './StaleDataBanner';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Period,
  PeriodKind,
  TYPE_GROUPS,
  daysOf,
  hoursByDay,
  hoursByGroup,
  inPeriod,
  periodOf,
  shiftPeriod,
  statusBreakdown,
  studyBySubject,
  studySummary,
  trailingPeriods,
} from '../utils/analytics';
import { addDays } from '../utils/dates';

// Chart chrome (docs/ANALYTICS.md): hairline grid, muted axes, planned vs. studied in two steps of one blue.
const GRID = '#e1e0d9';
const AXIS = { stroke: '#c3c2b7', tick: { fill: '#52514e', fontSize: 12 } };
const PLANNED = '#86b6ef';
const STUDIED = '#1c5cab';
const KIND_LABELS: Record<PeriodKind, string> = { day: 'Day', week: 'Week', month: 'Month' };
const CURRENT_LABELS: Record<PeriodKind, string> = { day: 'Today', week: 'This week', month: 'This month' };
const TREND_LENGTH: Record<PeriodKind, number> = { day: 14, week: 8, month: 6 };
const TREND_UNITS: Record<PeriodKind, string> = { day: 'Days', week: 'Weeks', month: 'Months' };
// Legend text stays in ink; the dot next to it carries the series color.
const LEGEND = {
  iconType: 'circle' as const,
  wrapperStyle: { fontSize: 12 },
  formatter: (value: string) => <span style={{ color: '#52514e' }}>{value}</span>,
};

const formatPeriod = (period: Period) => {
  if (period.kind === 'day') {
    return period.start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (period.kind === 'month') {
    return period.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const last = addDays(period.end, -1);
  const startFormat: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  // A week over New Year names both years.
  if (period.start.getFullYear() !== last.getFullYear()) startFormat.year = 'numeric';
  return `${period.start.toLocaleDateString('en-US', startFormat)} - ${last.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

const trendLabel = (period: Period) =>
  period.kind !== 'month'
    ? period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : period.start.toLocaleDateString('en-US', { month: 'short' });

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{detail}</p>
    </div>
  );
}

// A part-to-whole bar with a labelled legend, so no share is told by color alone.
function Meter({ label, parts }: { label: string; parts: { key: string; label: string; color: string; value: number }[] }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  return (
    <div>
      <div className="flex h-3 gap-0.5 rounded-full overflow-hidden bg-gray-100" role="img" aria-label={label}>
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <div key={p.key} style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }} />
            ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2 text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span>{p.label}</span>
            <span className="ml-auto font-medium text-gray-900">
              {p.value}
              {total > 0 && <span className="text-gray-500 font-normal"> ({Math.round((p.value / total) * 100)}%)</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Insight({ tone, title, text }: { tone: 'yellow' | 'red' | 'blue' | 'gray'; title: string; text: string }) {
  const styles = {
    yellow: ['bg-yellow-50', 'bg-yellow-500', 'text-yellow-900', 'text-yellow-700'],
    red: ['bg-red-50', 'bg-red-500', 'text-red-900', 'text-red-700'],
    blue: ['bg-blue-50', 'bg-blue-500', 'text-blue-900', 'text-blue-700'],
    gray: ['bg-gray-50', 'bg-gray-500', 'text-gray-900', 'text-gray-700'],
  }[tone];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${styles[0]}`}>
      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${styles[1]}`} />
      <div>
        <p className={`text-sm font-medium ${styles[2]}`}>{title}</p>
        <p className={`text-xs mt-1 ${styles[3]}`}>{text}</p>
      </div>
    </div>
  );
}

export function AnalyticsView() {
  const { subjects, topics } = useStore();
  const [period, setPeriod] = useState<Period>(() => periodOf('week', new Date()));
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const periodTextId = useId();

  // One request covers the selected period and the trend before it.
  const trend = useMemo(() => trailingPeriods(period, TREND_LENGTH[period.kind]), [period]);
  const { occurrences, error, retry } = useOccurrences(trend[0].start, period.end);

  const now = new Date();
  const isCurrent = period.start <= now && now < period.end;
  const inThisPeriod = period.kind === 'day' ? 'on this day' : `in this ${period.kind}`;

  const stats = useMemo(() => {
    if (!occurrences) return null;
    const current = inPeriod(occurrences, period);
    const study = studySummary(current, now);
    const byGroup = hoursByGroup(occurrences, period);
    const sleep = byGroup.find((g) => g.key === 'sleep')!.hours;
    // A single day counts the nights that begin on it, or a night starting late that day would read as little sleep.
    const sleepPerDay =
      period.kind === 'day'
        ? current.filter((o) => o.type === 'sleep').reduce((sum, o) => sum + o.duration, 0) / 60
        : sleep / daysOf(period).length;
    return {
      study,
      byDay: hoursByDay(occurrences, period),
      byGroup,
      totalHours: byGroup.reduce((sum, g) => sum + g.hours, 0),
      sleepPerDay,
      statuses: statusBreakdown(current, now),
      bySubject: studyBySubject(current).map((row) => ({
        ...row,
        name: subjects.find((s) => s.id === row.subjectId)?.title ?? (row.subjectId ? 'Deleted subject' : 'No subject'),
      })),
      trend: trend.map((p) => {
        const summary = studySummary(inPeriod(occurrences, p), now);
        return { label: trendLabel(p), planned: summary.plannedHours, studied: summary.studiedHours };
      }),
    };
  }, [occurrences, period, trend, subjects]);

  const knowledge = [
    { key: 'green', label: 'Well known', color: '#0ca30c', value: topics.filter((t) => t.knowledge === 'green').length },
    { key: 'yellow', label: 'Partially known', color: '#fab219', value: topics.filter((t) => t.knowledge === 'yellow').length },
    { key: 'red', label: 'Needs work', color: '#d03b3b', value: topics.filter((t) => t.knowledge === 'red').length },
  ];
  const redTopics = knowledge[2].value;

  const insights = stats
    ? [
        stats.study.completionRate !== null && stats.study.completionRate < 70 && (
          <Insight
            key="Low Completion Rate"
            tone="yellow"
            title="Low Completion Rate"
            text={`You completed ${stats.study.completionRate}% of your study sessions ${inThisPeriod}. Consider reviewing your schedule to ensure it's realistic and achievable.`}
          />
        ),
        topics.length > 0 && redTopics > topics.length * 0.3 && (
          <Insight
            key="Many Topics Need Attention"
            tone="red"
            title="Many Topics Need Attention"
            text={`${redTopics} topics need work. Consider increasing study time or using the traffic light strategy.`}
          />
        ),
        stats.study.averageSessionMinutes > 120 && (
          <Insight
            key="Long Study Sessions"
            tone="blue"
            title="Long Study Sessions"
            text={`Your average study session is ${stats.study.averageSessionMinutes} minutes. Consider breaking them into shorter sessions with breaks for better retention.`}
          />
        ),
        stats.sleepPerDay > 0 && stats.sleepPerDay < 7 && (
          <Insight
            key="Little Sleep Scheduled"
            tone="blue"
            title="Little Sleep Scheduled"
            text={`Your schedule has ${stats.sleepPerDay.toFixed(1)} hours of sleep ${period.kind === 'day' ? 'on this day' : 'per day'}. Seven or more hours help memory consolidation.`}
          />
        ),
        stats.study.plannedHours === 0 && (
          <Insight
            key="No Study Planned"
            tone="gray"
            title="No Study Planned"
            text={`There are no study sessions ${inThisPeriod}. Add some or let the Study Planner on the Dashboard fill your free time.`}
          />
        ),
        stats.statuses.every((s) => s.status === 'scheduled' || s.count === 0) && (
          <Insight
            key="Start Tracking"
            tone="gray"
            title="Start Tracking"
            text="Mark activities as done, partially done or skipped in the Calendar to see meaningful analytics."
          />
        ),
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Header and period controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Analytics</h2>
          <p className="text-gray-600 mt-1">Track your progress and study patterns over time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden" role="group" aria-label="Report period">
            {(['day', 'week', 'month'] as const).map((kind) => (
              <button
                key={kind}
                onClick={() => setPeriod(periodOf(kind, isCurrent ? now : period.start))}
                aria-pressed={period.kind === kind}
                className={`px-3 py-2 text-sm ${
                  period.kind === kind ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {KIND_LABELS[kind]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPeriod(shiftPeriod(period, -1))}
            aria-label={`Previous ${period.kind}`}
            className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
            <PopoverTrigger asChild>
              <button
                aria-label="Pick a date"
                aria-describedby={periodTextId}
                style={{ minWidth: '11rem' }}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <CalendarDays className="w-4 h-4 text-gray-500" aria-hidden="true" />
                <span id={periodTextId} data-testid="analytics-period">
                  {formatPeriod(period)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent collisionPadding={16}>
              <Calendar
                mode="single"
                required
                initialFocus
                defaultMonth={period.start}
                selected={period.kind === 'day' ? period.start : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  setPeriod(periodOf('day', date));
                  setIsPickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <button
            onClick={() => setPeriod(shiftPeriod(period, 1))}
            aria-label={`Next ${period.kind}`}
            className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPeriod(periodOf(period.kind, now))}
            disabled={isCurrent}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {CURRENT_LABELS[period.kind]}
          </button>
        </div>
      </div>

      {error && <StaleDataBanner error={error} stale={stats !== null} onRetry={retry} />}
      {!error && !stats && <p className="text-gray-500">Loading the report...</p>}

      {stats && (
        <>
          {/* Key metrics of the period */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Study Planned"
              value={`${stats.study.plannedHours} h`}
              detail={`Avg. session ${stats.study.averageSessionMinutes} min`}
            />
            <StatTile label="Studied" value={`${stats.study.studiedHours} h`} detail="Done sessions, partial ones count half" />
            <StatTile
              label="Completion Rate"
              value={stats.study.completionRate === null ? '-' : `${stats.study.completionRate}%`}
              detail={`Of ${stats.study.startedSessions} study session${stats.study.startedSessions === 1 ? '' : 's'} so far`}
            />
            <StatTile
              label="Topics Mastered"
              value={String(knowledge[0].value)}
              detail={`Out of ${topics.length} topics (current)`}
            />
          </div>

          {/* Where the time goes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900">
              Time by Activity Type ({period.kind === 'day' ? 'Hours' : 'Hours per Day'})
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Past days come from your history, coming days from your current schedule.
            </p>
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.byDay} barCategoryGap="20%">
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" {...AXIS} interval={period.kind === 'month' ? 1 : 0} />
                    <YAxis {...AXIS} domain={[0, 24]} ticks={[0, 6, 12, 18, 24]} width={32} />
                    <Tooltip
                      cursor={{ fill: 'rgba(11,11,11,0.04)' }}
                      formatter={(value: number, name: string) => [`${value} h`, name]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]
                          ? (payload[0].payload.day as Date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''
                      }
                    />
                    <Legend {...LEGEND} />
                    {TYPE_GROUPS.map((group) => (
                      <Bar
                        isAnimationActive={false}
                        key={group.key}
                        dataKey={group.key}
                        name={group.label}
                        stackId="day"
                        fill={group.color}
                        stroke="#ffffff"
                        strokeWidth={1}
                        maxBarSize={36}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-sm self-start">
                <caption className="sr-only">Hours by activity type</caption>
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 font-normal">Type</th>
                    <th className="py-2 font-normal text-right">Hours</th>
                    <th className="py-2 font-normal text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byGroup.map((group) => (
                    <tr key={group.key} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: group.color }} />
                        {group.label}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-900">{group.hours}</td>
                      <td className="py-2 text-right tabular-nums text-gray-500">
                        {stats.totalHours > 0 ? `${Math.round((group.hours / stats.totalHours) * 100)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Study trend */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900">
                Study Trend (Last {TREND_LENGTH[period.kind]} {TREND_UNITS[period.kind]}, Hours)
              </h3>
              <ResponsiveContainer width="100%" height={260} className="mt-4">
                <LineChart data={stats.trend}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" {...AXIS} />
                  <YAxis {...AXIS} width={32} allowDecimals={false} />
                  <Tooltip formatter={(value: number, name: string) => [`${value} h`, name]} />
                  <Legend {...LEGEND} />
                  <Line isAnimationActive={false} dataKey="planned" name="Planned" stroke={PLANNED} strokeWidth={2} dot={{ r: 4 }} />
                  <Line isAnimationActive={false} dataKey="studied" name="Studied" stroke={STUDIED} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Study by subject */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900">Study & Classes by Subject (Hours)</h3>
              {stats.bySubject.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(160, 48 * stats.bySubject.length + 60)} className="mt-4">
                  <BarChart data={stats.bySubject} layout="vertical" barGap={2}>
                    <CartesianGrid horizontal={false} stroke={GRID} />
                    <XAxis type="number" {...AXIS} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" {...AXIS} width={110} />
                    <Tooltip
                      cursor={{ fill: 'rgba(11,11,11,0.04)' }}
                      formatter={(value: number, name: string) => [`${value} h`, name]}
                    />
                    <Legend {...LEGEND} />
                    <Bar isAnimationActive={false} dataKey="planned" name="Planned" fill={PLANNED} radius={[0, 4, 4, 0]} maxBarSize={14} />
                    <Bar isAnimationActive={false} dataKey="studied" name="Studied" fill={STUDIED} radius={[0, 4, 4, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">No study sessions or classes {inThisPeriod}.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-1">How Past Activities Were Marked</h3>
              <p className="text-sm text-gray-500 mb-4">
                Activities of this {period.kind} that have already started. Mark them in the Calendar.
              </p>
              <Meter
                label="Activity statuses"
                parts={stats.statuses.map((s) => ({ key: s.status, label: s.label, color: s.color, value: s.count }))}
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-1">Knowledge Distribution</h3>
              <p className="text-sm text-gray-500 mb-4">Current rating of your {topics.length} topics.</p>
              <Meter label="Topic knowledge" parts={knowledge} />
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Insights & Recommendations</h3>
            <div className="space-y-3">
              {insights.length > 0 ? insights : <p className="text-sm text-gray-500">Nothing to flag.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
