import { useState } from 'react';
import { Plus, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Activity } from '../types';
import { ActivityModal } from './ActivityModal';

export function ActivitiesView() {
  const { activities } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'done' | 'skipped'>('all');

  const filteredActivities = activities
    .filter((activity) => {
      if (filter === 'all') return true;
      return activity.status === filter;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'skipped':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      studying: 'Studying',
      class: 'Class',
      rest: 'Rest',
      sport: 'Sport',
      work: 'Work',
      meal: 'Meal',
      sleep: 'Sleep',
      commute: 'Commute',
      'one-time': 'One-time',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Activities</h2>
          <p className="text-gray-600 mt-1">Manage your daily activities and tasks</p>
        </div>
        <button
          onClick={() => {
            setSelectedActivity(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Activity
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'done', label: 'Completed' },
          { value: 'skipped', label: 'Skipped' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as any)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              filter === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {filter === 'all'
              ? 'No activities yet. Create your first activity to get started.'
              : `No ${filter} activities.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {filteredActivities.map((activity) => {
            const startTime = new Date(activity.startTime);
            const endTime = new Date(startTime.getTime() + activity.duration * 60000);

            return (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedActivity(activity);
                  setIsModalOpen(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(activity.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{activity.title}</h3>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                          {getTypeLabel(activity.type)}
                        </span>
                        {!activity.negotiable && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                            Non-negotiable
                          </span>
                        )}
                        {activity.recurring && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{startTime.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {startTime.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {endTime.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <span>{activity.duration} min</span>
                      </div>
                      {activity.notes && (
                        <p className="text-sm text-gray-600 mt-2">{activity.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-500 capitalize">
                      Priority: {activity.priority}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ActivityModal
          activity={selectedActivity}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
}
