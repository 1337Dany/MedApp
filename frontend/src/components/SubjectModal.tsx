import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Subject, StudyStrategy, SubjectMode } from '../types';

interface SubjectModalProps {
  subject: Subject | null;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#06b6d4',
];

export function SubjectModal({ subject, onClose }: SubjectModalProps) {
  const { addSubject, updateSubject } = useStore();

  const [formData, setFormData] = useState({
    title: subject?.title || '',
    examDate: subject?.examDate
      ? new Date(subject.examDate).toISOString().split('T')[0]
      : '',
    weight: subject?.weight || 5,
    strategy: subject?.strategy || ('manual' as StudyStrategy),
    mode: subject?.mode || ('relaxed' as SubjectMode),
    color: subject?.color || PRESET_COLORS[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subjectData: Partial<Subject> = {
      title: formData.title,
      examDate: formData.examDate ? new Date(formData.examDate) : undefined,
      weight: formData.weight,
      strategy: formData.strategy,
      mode: formData.mode,
      color: formData.color,
    };

    if (subject) {
      updateSubject(subject.id, subjectData);
    } else {
      addSubject({
        id: crypto.randomUUID(),
        ...subjectData,
      } as Subject);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {subject ? 'Edit Subject' : 'New Subject'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Anatomy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Date
            </label>
            <input
              type="date"
              value={formData.examDate}
              onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Study Strategy
            </label>
            <select
              value={formData.strategy}
              onChange={(e) => setFormData({ ...formData, strategy: e.target.value as StudyStrategy })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="manual">Manual</option>
              <option value="traffic-light">Traffic Light</option>
              <option value="active-recall">Active Recall</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              {formData.strategy === 'manual' && 'You control all study sessions manually'}
              {formData.strategy === 'traffic-light' && 'Prioritize topics based on knowledge level'}
              {formData.strategy === 'active-recall' && 'Automated spaced repetition reminders'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode
            </label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value as SubjectMode })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relaxed">Relaxed</option>
              <option value="determined">Determined</option>
              <option value="emergency">Emergency</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              {formData.mode === 'relaxed' && 'Long-term learning with flexible scheduling'}
              {formData.mode === 'determined' && 'Exam is approaching, increased focus'}
              {formData.mode === 'emergency' && 'Very little time left, maximum priority'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (Priority)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>Low</span>
              <span className="font-medium">{formData.weight}</span>
              <span>High</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {subject ? 'Update' : 'Create'}
            </button>
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
