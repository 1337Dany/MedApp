import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Activity, ActivityType, ActivityStatus } from '../types';

interface ActivityModalProps {
  activity: Activity | null;
  initialDate?: Date;
  initialHour?: number;
  onClose: () => void;
}

export function ActivityModal({ activity, initialDate, initialHour, onClose }: ActivityModalProps) {
  const { addActivity, updateActivity, deleteActivity, subjects } = useStore();

  const [formData, setFormData] = useState({
    title: activity?.title || '',
    type: activity?.type || ('studying' as ActivityType),
    date: activity?.startTime 
      ? new Date(activity.startTime).toISOString().split('T')[0]
      : initialDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    time: activity?.startTime
      ? new Date(activity.startTime).toTimeString().slice(0, 5)
      : initialHour !== undefined
      ? `${initialHour.toString().padStart(2, '0')}:00`
      : '09:00',
    duration: activity?.duration || 60,
    recurring: activity?.recurring || false,
    recurrenceFrequency: activity?.recurrencePattern?.frequency || 'weekly',
    recurrenceDays: activity?.recurrencePattern?.daysOfWeek || [],
    negotiable: activity?.negotiable ?? true,
    priority: activity?.priority || 3,
    status: activity?.status || ('scheduled' as ActivityStatus),
    subjectId: activity?.subjectId || '',
    notes: activity?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startTime = new Date(`${formData.date}T${formData.time}`);

    const activityData: Partial<Activity> = {
      title: formData.title,
      type: formData.type,
      startTime,
      duration: formData.duration,
      recurring: formData.recurring,
      recurrencePattern: formData.recurring
        ? {
            frequency: formData.recurrenceFrequency as 'daily' | 'weekly',
            daysOfWeek: formData.recurrenceDays,
          }
        : undefined,
      negotiable: formData.negotiable,
      priority: formData.priority,
      status: formData.status,
      subjectId: formData.subjectId || undefined,
      notes: formData.notes || undefined,
    };

    if (activity) {
      updateActivity(activity.id, activityData);
    } else {
      addActivity({
        id: crypto.randomUUID(),
        ...activityData,
      } as Activity);
    }

    onClose();
  };

  const handleDelete = () => {
    if (activity && confirm('Are you sure you want to delete this activity?')) {
      deleteActivity(activity.id);
      onClose();
    }
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
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Study Anatomy"
            />
          </div>

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
          </div>

          {formData.type === 'studying' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, recurrenceFrequency: e.target.value })}
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {activity ? 'Update' : 'Create'}
            </button>
            {activity && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
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
        </form>
      </div>
    </div>
  );
}
