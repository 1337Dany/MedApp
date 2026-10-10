import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Activity } from '../types';
import { ActivityModal } from './ActivityModal';
import { addDays, startOfDay } from '../utils/dates';
import { expandOccurrences, Occurrence } from '../utils/recurrence';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT_PX = 60; // matches min-h-[60px] of an hour cell

export function CalendarView() {
  const { activities, subjects } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
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

  // Recurring series are expanded into their occurrences in this week.
  const weekOccurrences = useMemo(
    () => expandOccurrences(activities, weekStart, addDays(weekStart, 7)),
    [activities, weekStart],
  );

  // Each occurrence is drawn once per day, in the hour cell where it starts on that day
  // (00:00 when it continues from the previous day), as tall as its duration within the day.
  const getBlocksForSlot = (dayIndex: number, hour: number) => {
    const dayStart = weekDays[dayIndex];
    const dayEnd = addDays(dayStart, 1);

    return weekOccurrences.flatMap((occurrence: Occurrence) => {
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
    setIsModalOpen(true);
  };

  const handleActivityClick = (activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedActivity(activity);
    setNewActivitySlot(null);
    setIsModalOpen(true);
  };

  const getActivityColor = (activity: Activity) => {
    if (activity.subjectId) {
      const subject = subjects.find((s) => s.id === activity.subjectId);
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

    return typeColors[activity.type] || '#6b7280';
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
            className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextWeek}
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
                      >
                        {slotBlocks.map(({ occurrence, start, top, height }) => {
                          const { activity } = occurrence;
                          return (
                            <div
                              key={`${activity.id}-${start.getTime()}`}
                              className="absolute left-0 right-0 mx-1 z-10 rounded px-2 py-1 text-xs text-white cursor-pointer hover:opacity-80 overflow-hidden"
                              style={{
                                top: `${(top / 60) * HOUR_HEIGHT_PX}px`,
                                height: `${(height / 60) * HOUR_HEIGHT_PX}px`,
                                backgroundColor: getActivityColor(activity),
                              }}
                              onClick={(e) => handleActivityClick(activity, e)}
                            >
                              <div className="font-medium truncate">{activity.title}</div>
                              <div className="text-[10px] opacity-90">
                                {occurrence.start.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          );
                        })}
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
          initialDate={newActivitySlot ? weekDays[newActivitySlot.day] : undefined}
          initialHour={newActivitySlot?.hour}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedActivity(null);
            setNewActivitySlot(null);
          }}
        />
      )}
    </div>
  );
}
