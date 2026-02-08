import { Plus, Calendar, Zap, Target } from 'lucide-react';

interface QuickActionsProps {
  onAddSubject: () => void;
  onAddActivity: () => void;
  onViewCalendar: () => void;
}

export function QuickActions({ onAddSubject, onAddActivity, onViewCalendar }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={onAddSubject}
        className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
      >
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-medium text-gray-900">Add Subject</p>
          <p className="text-xs text-gray-600">Create new subject</p>
        </div>
      </button>

      <button
        onClick={onAddActivity}
        className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
      >
        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-medium text-gray-900">Add Activity</p>
          <p className="text-xs text-gray-600">Schedule new task</p>
        </div>
      </button>

      <button
        onClick={onViewCalendar}
        className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
      >
        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-medium text-gray-900">View Calendar</p>
          <p className="text-xs text-gray-600">Check schedule</p>
        </div>
      </button>

      <button
        className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors group"
      >
        <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-medium text-gray-900">Study Session</p>
          <p className="text-xs text-gray-600">Start studying</p>
        </div>
      </button>
    </div>
  );
}