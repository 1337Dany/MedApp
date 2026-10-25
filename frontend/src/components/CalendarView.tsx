import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Activity, ActivityStatus, ActivityType } from '../types';
import { ActivityModal } from './ActivityModal';
import { addDays, startOfDay } from '../utils/dates';
import { expandOccurrences } from '../utils/recurrence';
import { useOccurrences } from '../hooks/useOccurrences';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT_PX = 60; // matches min-h-[60px] of an hour cell
const STATUS_LABELS: Record<ActivityStatus, string> = {
  scheduled: '',
  done: 'Done',
  partial: 'Partly done',
  skipped: 'Skipped',
};

// One block on the calendar. `activity` is missing for history of an activity that has been deleted.
interface CalendarItem {
  key: string;
  title: string;
  type: ActivityType;
  subjectId?: string;
  start: Date;
  end: Date;
  status: ActivityStatus;
  activity?: Activity;
}

export function CalendarView() {
  const { activities, subjects } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<{ start: Date; status: ActivityStatus } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivitySlot, setNewActivitySlot] = useState<{ day: number; hour: number } | null>(null);

  // Sunday 00:00 of the displayed week.
  const weekStart = useMemo(() => addDays(startOfDay(currentDate), -currentDate.getDay()), [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });
  }, [weekStart]);

  // From the day before, so an occurrence that continues past midnight into the week is drawn.
  const { occurrences: history } = useOccurrences(addDays(weekStart, -1), addDays(weekStart, 7));

  // What has started comes from the history, which keeps past weeks as they were when the schedule changes.
  // The rest is the current schedule (recurring series expanded), with the marks of single occurrences.
  const weekOccurrences = useMemo((): CalendarItem[] => {
    const now = new Date();
    const marks = new Map((history ?? []).map((o) => [`${o.activityId}|${o.start.getTime()}`, o.status]));
    const live = expandOccurrences(activities, weekStart, addDays(weekStart, 7))
      .filter((o) => !history || o.start >= now)
      .map(({ activity, start, end }) => ({
        key: `${activity.id}-${start.getTime()}`,
        title: activity.title,
        type: activity.type,
        subjectId: activity.subjectId,
        start,
        end,
        status:
          marks.get(`${activity.id}|${start.getTime()}`) ??
          (activity.recurring ? (activity.status === 'skipped' ? 'skipped' : 'scheduled') : activity.status),
        activity,
      }));
    const past = (history ?? [])
      .filter((o) => o.start < now)
      .map((o, i) => ({
        key: `${o.activityId ?? `deleted-${i}`}-${o.start.getTime()}`,
        title: o.title,
        type: o.type,
        subjectId: o.subjectId,
        start: o.start,
        end: o.end,
        status: o.status,
        activity: activities.find((a) => a.id === o.activityId),
      }));
    return [...past, ...live];
  }, [activities, history, weekStart]);

  // Each occurrence is drawn once per day, in the hour cell where it starts on that day
  // (00:00 when it continues from the previous day), as tall as its duration within the day.
  const getBlocksForSlot = (dayIndex: number, hour: number) => {
    const dayStart = weekDays[dayIndex];
    const dayEnd = addDays(dayStart, 1);

    return weekOccurrences.flatMap((occurrence) => {
      const start = occurrence.start > dayStart ? occurrence.start : dayStart;
      const end = occurrence.end < dayEnd ? occurrence.end : dayEnd;
      if (start >= end || start.getHours() !== hour || start.getDate() !== dayStart.getDate()) return [];
      const minutes = (end.getTime() - start.getTime()) / 60_000;
      return [{ occurrence, start, top: start.getMinutes(), height: Math.max(minutes, 20) }];
    });
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleSlotClick = (dayIndex: number, hour: number) => {
    const date = weekDays[dayIndex];
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    
    setNewActivitySlot({ day: dayIndex, hour });
    setSelectedActivity(null);
    setSelectedOccurrence(null);
    setIsModalOpen(true);
  };

  // A block of a deleted activity is history only.
  const handleActivityClick = (item: CalendarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.activity) return;
    setSelectedActivity(item.activity);
    setSelectedOccurrence({ start: item.start, status: item.status });
    setNewActivitySlot(null);
    setIsModalOpen(true);
  };

  const getActivityColor = (item: CalendarItem) => {
    if (item.subjectId) {
      const subject = subjects.find((s) => s.id === item.subjectId);
      if (subject) return subject.color;
    }

    const typeColors = {
      studying: '#3b82f6',
      class: '#8b5cf6',
      rest: '#10b981',
      sport: '#f59e0b',
      work: '#ef4444',
      meal: '#ec4899',
      sleep: '#6366f1',
      commute: '#64748b',
      'one-time': '#14b8a6',
    };

    return typeColors[item.type] || '#6b7280';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Weekly Calendar</h2>
          <p className="text-gray-600 mt-1">
            {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={previousWeek}
            aria-label="Previous week"
            className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextWeek}
            aria-label="Next week"
            className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Days Header */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-3 text-sm font-medium text-gray-700 bg-gray-50"></div>
              {weekDays.map((day, index) => {
                const isToday =
                  day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={index}
                    className={`p-3 text-center border-l border-gray-200 ${
                      isToday ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-700">
                      {DAYS[index].slice(0, 3)}
                    </div>
                    <div
                      className={`text-lg font-semibold mt-1 ${
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="max-h-[600px] overflow-y-auto">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-gray-200">
                  <div className="p-3 text-xs text-gray-600 bg-gray-50 border-r border-gray-200">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {weekDays.map((_, dayIndex) => {
                    const slotBlocks = getBlocksForSlot(dayIndex, hour);
                    return (
                      <div
                        key={dayIndex}
                        className="relative border-l border-gray-200 min-h-[60px] hover:bg-gray-50 cursor-pointer group"
                        onClick={() => handleSlotClick(dayIndex, hour)}
                        data-testid={`slot-${dayIndex}-${hour}`}
                      >
                        {slotBlocks.map(({ occurrence, start, top, height }) => (
                          <div
                            key={`${occurrence.key}-${start.getTime()}`}
                            className={`absolute left-0 right-0 mx-1 z-10 rounded px-2 py-1 text-xs text-white overflow-hidden ${
                              occurrence.activity ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                            } ${occurrence.status === 'skipped' ? 'opacity-60' : ''}`}
                            style={{
                              top: `${(top / 60) * HOUR_HEIGHT_PX}px`,
                              height: `${(height / 60) * HOUR_HEIGHT_PX}px`,
                              backgroundColor: getActivityColor(occurrence),
                            }}
                            title={occurrence.activity ? undefined : 'Deleted activity (history)'}
                            onClick={(e) => handleActivityClick(occurrence, e)}
                          >
                            <div className={`font-medium truncate ${occurrence.status === 'skipped' ? 'line-through' : ''}`}>
                              {occurrence.status === 'done' && <span aria-hidden="true">✓ </span>}
                              <span>{occurrence.title}</span>
                            </div>
                            <div className="text-[10px] opacity-90">
                              {occurrence.start.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {STATUS_LABELS[occurrence.status] && ` · ${STATUS_LABELS[occurrence.status]}`}
                            </div>
                          </div>
                        ))}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Modal */}
      {isModalOpen && (
        <ActivityModal
          activity={selectedActivity}
          occurrence={selectedOccurrence ?? undefined}
          initialDate={newActivitySlot ? weekDays[newActivitySlot.day] : undefined}
          initialHour={newActivitySlot?.hour}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedActivity(null);
            setSelectedOccurrence(null);
            setNewActivitySlot(null);
          }}
        />
      )}
    </div>
  );
}
