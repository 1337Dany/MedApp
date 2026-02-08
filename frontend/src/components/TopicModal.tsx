import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Topic, TopicKnowledge } from '../types';

interface TopicModalProps {
  topic: Topic | null;
  subjectId?: string;
  onClose: () => void;
}

export function TopicModal({ topic, subjectId, onClose }: TopicModalProps) {
  const { addTopic, updateTopic, topics } = useStore();

  const [formData, setFormData] = useState({
    title: topic?.title || '',
    knowledge: topic?.knowledge || ('red' as TopicKnowledge),
    notes: topic?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId && !topic) {
      alert('Subject ID is required');
      return;
    }

    const topicData: Partial<Topic> = {
      title: formData.title,
      knowledge: formData.knowledge,
      notes: formData.notes || undefined,
    };

    if (topic) {
      updateTopic(topic.id, topicData);
    } else {
      const existingTopics = topics.filter((t) => t.subjectId === subjectId);
      const maxOrder = existingTopics.length > 0
        ? Math.max(...existingTopics.map((t) => t.order))
        : -1;

      addTopic({
        id: crypto.randomUUID(),
        subjectId: subjectId!,
        order: maxOrder + 1,
        ...topicData,
      } as Topic);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {topic ? 'Edit Topic' : 'New Topic'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Heart Structure"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Knowledge Level
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="knowledge"
                  value="green"
                  checked={formData.knowledge === 'green'}
                  onChange={(e) => setFormData({ ...formData, knowledge: e.target.value as TopicKnowledge })}
                  className="w-4 h-4 text-green-600"
                />
                <div className="w-4 h-4 bg-green-500 rounded-full" />
                <div>
                  <div className="font-medium text-gray-900">Well Known</div>
                  <div className="text-xs text-gray-600">I understand this topic well</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="knowledge"
                  value="yellow"
                  checked={formData.knowledge === 'yellow'}
                  onChange={(e) => setFormData({ ...formData, knowledge: e.target.value as TopicKnowledge })}
                  className="w-4 h-4 text-yellow-600"
                />
                <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                <div>
                  <div className="font-medium text-gray-900">Partially Known</div>
                  <div className="text-xs text-gray-600">I need more practice</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="knowledge"
                  value="red"
                  checked={formData.knowledge === 'red'}
                  onChange={(e) => setFormData({ ...formData, knowledge: e.target.value as TopicKnowledge })}
                  className="w-4 h-4 text-red-600"
                />
                <div className="w-4 h-4 bg-red-500 rounded-full" />
                <div>
                  <div className="font-medium text-gray-900">Needs Work</div>
                  <div className="text-xs text-gray-600">I need to study this</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about this topic..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {topic ? 'Update' : 'Create'}
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
