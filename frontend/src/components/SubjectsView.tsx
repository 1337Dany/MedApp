import { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Subject, Topic } from '../types';
import { SubjectModal } from './SubjectModal';
import { TopicModal } from './TopicModal';

export function SubjectsView() {
  const { subjects, topics, updateTopic, deleteTopic, deleteSubject } = useStore();
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [subjectForNewTopic, setSubjectForNewTopic] = useState<string | null>(null);

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  const handleEditSubject = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSubject(subject);
    setIsSubjectModalOpen(true);
  };

  const handleDeleteSubject = (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this subject? All topics will also be deleted.')) {
      deleteSubject(subjectId);
    }
  };

  const handleAddTopic = (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubjectForNewTopic(subjectId);
    setSelectedTopic(null);
    setIsTopicModalOpen(true);
  };

  const handleEditTopic = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTopic(topic);
    setSubjectForNewTopic(null);
    setIsTopicModalOpen(true);
  };

  const handleDeleteTopic = (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this topic?')) {
      deleteTopic(topicId);
    }
  };

  const getTopicsForSubject = (subjectId: string) => {
    return topics
      .filter((t) => t.subjectId === subjectId)
      .sort((a, b) => a.order - b.order);
  };

  const getModeColor = (mode: string) => {
    const colors = {
      relaxed: 'bg-green-100 text-green-800',
      determined: 'bg-yellow-100 text-yellow-800',
      emergency: 'bg-red-100 text-red-800',
    };
    return colors[mode as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getKnowledgeColor = (knowledge: string) => {
    const colors = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
    };
    return colors[knowledge as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Subjects & Topics</h2>
          <p className="text-gray-600 mt-1">Manage your study subjects and topics</p>
        </div>
        <button
          onClick={() => {
            setSelectedSubject(null);
            setIsSubjectModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Subject
        </button>
      </div>

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No subjects yet. Create your first subject to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => {
            const subjectTopics = getTopicsForSubject(subject.id);
            const isExpanded = expandedSubjects.has(subject.id);
            const knowledgeStats = {
              green: subjectTopics.filter((t) => t.knowledge === 'green').length,
              yellow: subjectTopics.filter((t) => t.knowledge === 'yellow').length,
              red: subjectTopics.filter((t) => t.knowledge === 'red').length,
            };

            return (
              <div key={subject.id} className="bg-white rounded-lg border border-gray-200">
                {/* Subject Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSubject(subject.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div
                        className="w-4 h-4 rounded-full mt-1"
                        style={{ backgroundColor: subject.color }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900">{subject.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getModeColor(subject.mode)}`}>
                            {subject.mode}
                          </span>
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                            {subject.strategy === 'traffic-light' ? 'Traffic Light' : 
                             subject.strategy === 'active-recall' ? 'Active Recall' : 'Manual'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          {subject.examDate && (
                            <span>
                              Exam: {new Date(subject.examDate).toLocaleDateString()}
                            </span>
                          )}
                          <span>{subjectTopics.length} topics</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span>{knowledgeStats.green}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-yellow-500" />
                              <span>{knowledgeStats.yellow}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span>{knowledgeStats.red}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleAddTopic(subject.id, e)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleEditSubject(subject, e)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSubject(subject.id, e)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Topics List */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {subjectTopics.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-gray-500 text-sm">No topics yet. Add your first topic.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {subjectTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="p-4 pl-16 hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                className={`w-3 h-3 rounded-full ${getKnowledgeColor(topic.knowledge)}`}
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{topic.title}</p>
                                {topic.notes && (
                                  <p className="text-xs text-gray-600 mt-1">{topic.notes}</p>
                                )}
                                {topic.lastStudied && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Last studied: {new Date(topic.lastStudied).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => handleEditTopic(topic, e)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteTopic(topic.id, e)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isSubjectModalOpen && (
        <SubjectModal
          subject={selectedSubject}
          onClose={() => {
            setIsSubjectModalOpen(false);
            setSelectedSubject(null);
          }}
        />
      )}

      {isTopicModalOpen && (
        <TopicModal
          topic={selectedTopic}
          subjectId={subjectForNewTopic || selectedTopic?.subjectId}
          onClose={() => {
            setIsTopicModalOpen(false);
            setSelectedTopic(null);
            setSubjectForNewTopic(null);
          }}
        />
      )}
    </div>
  );
}
