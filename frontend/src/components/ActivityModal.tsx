import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Activity, ActivityType, ActivityStatus } from '../types';
import { parseDateOnly, toDateInputValue, toTimeInputValue } from '../utils/dates';

// Activity types that can belong to a subject.
const SUBJECT_TYPES: ActivityType[] = ['studying', 'class'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OCCURRENCE_STATUSES: { value: ActivityStatus; label: string }[] = [
  { value: 'scheduled', label: 'Not marked' },
  { value: 'done', label: 'Done' },
  { value: 'partial', label: 'Partially done' },
  { value: 'skipped', label: 'Skipped' },
];

interface ActivityModalProps {
  activity: Activity | null;
  // The occurrence clicked in the calendar; a recurring activity is marked per occurrence.
  occurrence?: { start: Date; status: ActivityStatus };
  initialDate?: Date;
  initialHour?: number;
  onClose: () => void;
}

export function ActivityModal({ activity, occurrence, initialDate, initialHour, onClose }: ActivityModalProps) {
  const { addActivity, updateActivity, deleteActivity, deleteSeriesOccurrence, setOccurrenceStatus, subjects, topics } =
    useStore();
  const [occurrenceStatus, setOccurrenceStatusValue] = useState(occurrence?.status);
  // Deleting an occurrence of a series first asks whether only it or the whole series goes.
  const [choosingDelete, setChoosingDelete] = useState(false);

  const [formData, setFormData] = useState({
    title: activity?.title || '',
    type: activity?.type || ('studying' as ActivityType),
    date: toDateInputValue(activity?.startTime ? new Date(activity.startTime) : initialDate ?? new Date()),
    time: activity?.startTime
      ? toTimeInputValue(new Date(activity.startTime))
      : initialHour !== undefined
      ? `${initialHour.toString().padStart(2, '0')}:00`
      : '09:00',
    duration: activity?.duration || 60,
    recurring: activity?.recurring || false,
    recurrenceFrequency: (activity?.recurrencePattern?.frequency || 'weekly') as 'daily' | 'weekly',
    recurrenceDays: activity?.recurrencePattern?.daysOfWeek || [],
    recurrenceUntil: activity?.recurrencePattern?.until ? toDateInputValue(new Date(activity.recurrencePattern.until)) : '',
    negotiable: activity?.negotiable ?? true,
    priority: activity?.priority || 3,
    status: activity?.status || ('scheduled' as ActivityStatus),
    subjectId: activity?.subjectId || '',
    topicId: activity?.topicId || '',
    notes: activity?.notes || '',
  });

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // A series has no status of its own in the form: its occurrences are marked one by one.
  const isSeries = formData.recurring;
  const markOccurrence = async (status: ActivityStatus) => {
    if (!activity || !occurrence) return;
    setError('');
    try {
      await setOccurrenceStatus(activity.id, occurrence.start, status);
      setOccurrenceStatusValue(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark the occurrence.');
    }
  };

  const canHaveSubject = SUBJECT_TYPES.includes(formData.type);
  const subjectTopics = topics
    .filter((t) => t.subjectId === formData.subjectId)
    .sort((a, b) => a.order - b.order);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Built from local date and time parts, so the activity lands where the user clicked.
    const startTime = new Date(`${formData.date}T${formData.time}`);

    if (formData.recurring && formData.recurrenceFrequency === 'weekly' && formData.recurrenceDays.length === 0) {
      setError('Pick at least one day for a weekly activity.');
      return;
    }

    const activityData: Omit<Activity, 'id'> = {
      title: formData.title,
      type: formData.type,
      startTime,
      duration: formData.duration,
      recurring: formData.recurring,
      recurrencePattern: formData.recurring
        ? {
            frequency: formData.recurrenceFrequency as 'daily' | 'weekly',
            daysOfWeek: formData.recurrenceDays,
            until: formData.recurrenceUntil ? parseDateOnly(formData.recurrenceUntil) : undefined,
          }
        : undefined,
      negotiable: formData.negotiable,
      priority: formData.priority,
      status: isSeries ? (activity?.recurring ? activity.status : 'scheduled') : formData.status,
      subjectId: canHaveSubject && formData.subjectId ? formData.subjectId : undefined,
      topicId: canHaveSubject && formData.subjectId && formData.topicId ? formData.topicId : undefined,
      notes: formData.notes || undefined,
    };

    setIsSaving(true);
    try {
      if (activity) {
        await updateActivity(activity.id, activityData);
      } else {
        await addActivity(activityData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the activity.');
    } finally {
      setIsSaving(false);
    }
  };

  const runDelete = async (remove: () => Promise<void>) => {
    try {
      await remove();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the activity.');
    }
  };

  const handleDelete = async () => {
    if (!activity) return;
    if (activity.recurring && occurrence) {
      setChoosingDelete(true);
      return;
    }
    const question = activity.recurring
      ? `Delete the whole series "${activity.title}"? All its occurrences, past ones included, disappear from the calendar and analytics.`
      : 'Are you sure you want to delete this activity?';
    if (confirm(question)) await runDelete(() => deleteActivity(activity.id));
  };

  const toggleRecurrenceDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(day)
        ? prev.recurrenceDays.filter((d) => d !== day)
        : [...prev.recurrenceDays, day],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {activity ? 'Edit Activity' : 'New Activity'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Study Anatomy"
            />
          </div>

          {activity?.recurring && occurrence && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                This occurrence:{' '}
                {occurrence.start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })},{' '}
                {occurrence.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Status of this occurrence">
                {OCCURRENCE_STATUSES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => markOccurrence(option.value)}
                    aria-pressed={occurrenceStatus === option.value}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      occurrenceStatus === option.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2">Saved right away. Changes below apply to the whole series.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ActivityType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="studying">Studying</option>
                <option value="class">Class</option>
                <option value="rest">Rest</option>
                <option value="sport">Sport</option>
                <option value="work">Work</option>
                <option value="meal">Meal</option>
                <option value="sleep">Sleep</option>
                <option value="commute">Commute</option>
                <option value="one-time">One-time Event</option>
              </select>
            </div>

            {!isSeries && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ActivityStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="done">Done</option>
                <option value="partial">Partially Done</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
            )}
            {isSeries && !occurrence && (
              <p className="self-end text-xs text-gray-500">
                Open an occurrence in the Calendar to mark it done or skipped.
              </p>
            )}
          </div>

          {canHaveSubject && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, topicId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title}
                    </option>
                  ))}
                </select>
              </div>

              {formData.type === 'studying' && formData.subjectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic
                  </label>
                  <select
                    value={formData.topicId}
                    onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Whole subject</option>
                    {subjectTopics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <input
              type="number"
              required
              min="15"
              max="1440"
              step="15"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Recurring</span>
            </label>

            {formData.recurring && (
              <div className="ml-6 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.recurrenceFrequency}
                    onChange={(e) => setFormData({ ...formData, recurrenceFrequency: e.target.value as 'daily' | 'weekly' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                {formData.recurrenceFrequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days of Week
                    </label>
                    <div className="flex gap-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleRecurrenceDay(index)}
                          aria-label={DAY_NAMES[index]}
                          aria-pressed={formData.recurrenceDays.includes(index)}
                          className={`w-10 h-10 rounded-full text-sm font-medium ${
                            formData.recurrenceDays.includes(index)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat until (optional)
                  </label>
                  <input
                    type="date"
                    min={formData.date}
                    value={formData.recurrenceUntil}
                    onChange={(e) => setFormData({ ...formData, recurrenceUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.negotiable}
                onChange={(e) => setFormData({ ...formData, negotiable: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Negotiable</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority (1-5)
              </label>
              <input
                type="number"
                required
                min="1"
                max="5"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : activity ? 'Update' : 'Create'}
            </button>
            {activity && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {activity.recurring && !occurrence ? 'Delete series' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>

          {choosingDelete && activity && occurrence && (
            <div role="group" aria-label="What to delete" className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                Delete only this occurrence, or the whole series "{activity.title}"? The whole series also disappears
                from past weeks and the analytics.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => runDelete(() => deleteSeriesOccurrence(activity.id, occurrence.start))}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Only this occurrence
                </button>
                <button
                  type="button"
                  onClick={() => runDelete(() => deleteActivity(activity.id))}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white text-red-700 border border-red-300 hover:bg-red-100"
                >
                  The whole series
                </button>
                <button
                  type="button"
                  onClick={() => setChoosingDelete(false)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
