import { create } from 'zustand';
import { Activity, Subject, Topic, Section, TimeBlock, OverloadWarning } from '../types';

interface AppState {
  activities: Activity[];
  subjects: Subject[];
  topics: Topic[];
  sections: Section[];
  timeBlocks: TimeBlock[];
  warnings: OverloadWarning[];
  
  // Activity actions
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  
  // Subject actions
  addSubject: (subject: Subject) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  
  // Topic actions
  addTopic: (topic: Topic) => void;
  updateTopic: (id: string, updates: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  
  // Section actions
  addSection: (section: Section) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => void;
  
  // Time block actions
  addTimeBlock: (block: TimeBlock) => void;
  updateTimeBlock: (index: number, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (index: number) => void;
}

export const useStore = create<AppState>((set) => ({
  activities: [],
  subjects: [],
  topics: [],
  sections: [],
  timeBlocks: [],
  warnings: [],
  
  addActivity: (activity) =>
    set((state) => ({ activities: [...state.activities, activity] })),
  
  updateActivity: (id, updates) =>
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),
  
  deleteActivity: (id) =>
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
    })),
  
  addSubject: (subject) =>
    set((state) => ({ subjects: [...state.subjects, subject] })),
  
  updateSubject: (id, updates) =>
    set((state) => ({
      subjects: state.subjects.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  
  deleteSubject: (id) =>
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
      topics: state.topics.filter((t) => t.subjectId !== id),
      sections: state.sections.filter((s) => s.subjectId !== id),
      activities: state.activities.filter((a) => a.subjectId !== id),
    })),
  
  addTopic: (topic) =>
    set((state) => ({ topics: [...state.topics, topic] })),
  
  updateTopic: (id, updates) =>
    set((state) => ({
      topics: state.topics.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  
  deleteTopic: (id) =>
    set((state) => ({
      topics: state.topics.filter((t) => t.id !== id),
    })),
  
  addSection: (section) =>
    set((state) => ({ sections: [...state.sections, section] })),
  
  updateSection: (id, updates) =>
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  
  deleteSection: (id) =>
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== id),
      topics: state.topics.map((t) =>
        t.sectionId === id ? { ...t, sectionId: undefined } : t
      ),
    })),
  
  addTimeBlock: (block) =>
    set((state) => ({ timeBlocks: [...state.timeBlocks, block] })),
  
  updateTimeBlock: (index, updates) =>
    set((state) => ({
      timeBlocks: state.timeBlocks.map((b, i) =>
        i === index ? { ...b, ...updates } : b
      ),
    })),
  
  deleteTimeBlock: (index) =>
    set((state) => ({
      timeBlocks: state.timeBlocks.filter((_, i) => i !== index),
    })),
}));
