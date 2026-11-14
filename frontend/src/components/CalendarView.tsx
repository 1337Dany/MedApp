import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Activity, ActivityStatus, ActivityType } from '../types';
import { ActivityModal } from './ActivityModal';
import { addDays, startOfDay } from '../utils/dates';
import { useOccurrences } from '../hooks/useOccurrences';
import { layoutLanes } from '../utils/calendarLayout';
import { StaleDataBanner } from './StaleDataBanner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT_PX = 60; // an hour cell: min-h-[60px], its bottom border included
const MIN_BLOCK_MINUTES = 20; // the shortest block that stays readable and clickable
const NO_PADDING_BELOW_PX = 24; // the title line with the vertical padding
const TIME_LINE_FROM_PX = 38; // the title and time lines with the vertical padding
const STATUS_LABELS: Record<ActivityStatus, string> = {
  scheduled: '',
  done: 'Done',
  partial: 'Partly done',
  skipped: 'Skipped',
};

const TYPE_COLORS: Record<ActivityType, string> = {
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

// One block on the calendar. `activity` is missing for history without an activity (a series that became a one-off).
interface CalendarItem {
  key: string;
  occurrenceId?: string;
  title: string;
  type: ActivityType;
  subjectId?: string;
  start: Date;
  end: Date;
  status: ActivityStatus;
  activity?: Activity;
}

export function CalendarView() {
  const { activities, subjects, deleteOccurrence } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<{ start: Date; status: ActivityStatus } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivitySlot, setNewActivitySlot] = useState<{ day: number; hour: number } | null>(null);

  // Sunday 00:00 of the displayed week.
  const weekStart = useMemo(() => addDays(startOfDay(currentDate), -currentDate.getDay()), [currentDate]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // From the day before, so an occurrence that continues past midnight into the week is drawn.
  const { occurrences: history, error, retry } = useOccurrences(addDays(weekStart, -1), addDays(weekStart, 7));

  // Everything on the grid comes from the server (docs/ANALYTICS.md). An occurrence of an activity deleted a moment
  // ago is hidden right away, also when the next read fails.
  const weekOccurrences = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];
    const byId = new Map(activities.map((a) => [a.id, a]));
    (history ?? []).forEach((o, i) => {
      const activity = o.activityId ? byId.get(o.activityId) : undefined;
      if (o.activityId && !activity) return;
      items.push({
        key: `${o.id ?? o.activityId ?? i}-${o.start.getTime()}`,
        occurrenceId: o.id,
        title: o.title,
        type: o.type,
        subjectId: o.subjectId,
        start: o.start,
        end: o.end,
        status: o.status,
        activity,
      });
    });
    return items;
  }, [activities, history]);

  // Each occurrence is drawn once per day, in the hour cell where it starts on that day (00:00 when it continues
  // from the previous day), as tall as its duration within the day. Lanes are per day, because overlapping blocks
  // can start in different hour cells.
  const blocksByDay = useMemo(
    () =>
      weekDays.map((dayStart) => {
        const dayEnd = addDays(dayStart, 1);
        return layoutLanes(
          weekOccurrences.flatMap((occurrence) => {
            const start = occurrence.start > dayStart ? occurrence.start : dayStart;
            const clippedEnd = occurrence.end < dayEnd ? occurrence.end : dayEnd;
            if (start >= clippedEnd) return [];
            const minutes = Math.max((clippedEnd.getTime() - start.getTime()) / 60_000, MIN_BLOCK_MINUTES);
            return [{ occurrence, start, end: new Date(start.getTime() + minutes * 60_000), top: start.getMinutes(), height: minutes }];
          }),
        );
      }),
    [weekDays, weekOccurrences],
  );

  const getBlocksForSlot = (dayIndex: number, hour: number) =>
    blocksByDay[dayIndex].filter((block) => block.start.getHours() === hour);

  const previousWeek = () => setCurrentDate(addDays(currentDate, -7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleSlotClick = (dayIndex: number, hour: number) => {
    setNewActivitySlot({ day: dayIndex, hour });
    setSelectedActivity(null);
    setSelectedOccurrence(null);
    setIsModalOpen(true);
  };

  // A block without an activity has nothing to edit; it can only be deleted.
  const handleActivityClick = (item: CalendarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.activity) {
      if (item.occurrenceId && confirm(`Delete this past entry of "${item.title}"?`)) {
        deleteOccurrence(item.occurrenceId).catch((err) =>
          alert(err instanceof Error ? err.message : 'Could not delete the entry.'),
        );
      }
      return;
    }
    setSelectedActivity(item.activity);
    setSelectedOccurrence({ start: item.start, status: item.status });
    setNewActivitySlot(null);
    setIsModalOpen(true);
  };

  const subjectColors = useMemo(() => new Map(subjects.map((s) => [s.id, s.color])), [subjects]);
  const getActivityColor = (item: CalendarItem) =>
    (item.subjectId && subjectColors.get(item.subjectId)) || TYPE_COLORS[item.type] || '#6b7280';

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

      {error && <StaleDataBanner error={error} stale={history !== null} onRetry={retry} />}

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
                <div key={hour} className="grid grid-cols-8">
                  <div className="p-3 text-xs text-gray-600 bg-gray-50 border-r border-b border-gray-200">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {weekDays.map((_, dayIndex) => {
                    const slotBlocks = getBlocksForSlot(dayIndex, hour);
                    return (
                      <div
                        key={dayIndex}
                        className="relative border-l border-b border-gray-200 min-h-[60px] hover:bg-gray-50 cursor-pointer group"
                        onClick={() => handleSlotClick(dayIndex, hour)}
                        data-testid={`slot-${dayIndex}-${hour}`}
                      >
                        {slotBlocks.map(({ occurrence, start, top, height, lane, lanes }) => {
                          const heightPx = (height / 60) * HOUR_HEIGHT_PX;
                          const timeLine = `${occurrence.start.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}${STATUS_LABELS[occurrence.status] ? ` · ${STATUS_LABELS[occurrence.status]}` : ''}`;
                          const showsTimeLine = heightPx >= TIME_LINE_FROM_PX;
                          return (
                            <div
                              key={`${occurrence.key}-${start.getTime()}`}
                              className={`absolute z-10 rounded px-2 ${heightPx < NO_PADDING_BELOW_PX ? 'py-0' : 'py-1'} text-xs text-white overflow-hidden ${
                                occurrence.activity ? 'cursor-pointer hover:opacity-80' : 'cursor-pointer opacity-70 hover:opacity-50'
                              } ${occurrence.status === 'skipped' ? 'opacity-60' : ''}`}
                              style={{
                                top: `${(top / 60) * HOUR_HEIGHT_PX}px`,
                                height: `${heightPx}px`,
                                left: `calc(${(lane / lanes) * 100}% + 4px)`,
                                width: `calc(${100 / lanes}% - 8px)`,
                                backgroundColor: getActivityColor(occurrence),
                              }}
                              title={`${occurrence.title}\n${timeLine}${occurrence.activity ? '' : '\nPast entry without an activity: click to delete'}`}
                              onClick={(e) => handleActivityClick(occurrence, e)}
                            >
                              <div className={`font-medium truncate ${occurrence.status === 'skipped' ? 'line-through' : ''}`}>
                                {occurrence.status === 'done' && <span aria-hidden="true">✓ </span>}
                                <span>{occurrence.title}</span>
                              </div>
                              {showsTimeLine && <div className="text-[10px] opacity-90 truncate">{timeLine}</div>}
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
