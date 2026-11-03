import { create } from 'zustand';
import { Activity, ActivityStatus, Subject, Topic, OverloadWarning } from '../types';
import { activitiesAPI, occurrencesAPI, planningAPI, subjectsAPI, topicsAPI } from '../services/api';

// Server data for the signed-in user. Every action writes through to the API first and updates
// local state only with what the server returned, so a failed call leaves the UI unchanged
// (the promise rejects with an ApiError the caller can show). Changes can make the server re-plan
// study sessions and review topics, so successful writes refresh that derived data in the background
// and bump historyVersion, which tells the views that read the occurrences to read them again.
interface AppState {
  activities: Activity[];
  subjects: Subject[];
  topics: Topic[];
  warnings: OverloadWarning[];
  historyVersion: number;
  isLoaded: boolean;
  isLoadingData: boolean;
  loadError: string | null;

  loadAll: () => Promise<void>;
  reset: () => void;

  // Study planner
  generatePlan: (days: number) => Promise<number>;
  // Re-reads what the server may have changed on its own (re-planning, topic reviews, warnings).
  refreshDerived: () => Promise<void>;

  // Activity actions
  addActivity: (activity: Omit<Activity, 'id'>) => Promise<Activity>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<Activity>;
  setActivityStatus: (id: string, status: ActivityStatus) => Promise<Activity>;
  // Marks one occurrence of a recurring activity; views re-read the occurrences on historyVersion.
  setOccurrenceStatus: (id: string, start: Date, status: ActivityStatus) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  // Deletes one occurrence of a recurring activity; the series and its other occurrences stay.
  deleteSeriesOccurrence: (id: string, start: Date) => Promise<void>;
  // Removes a past entry that no longer belongs to an activity.
  deleteOccurrence: (id: string) => Promise<void>;

  // Subject actions
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<Subject>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<Subject>;
  deleteSubject: (id: string) => Promise<void>;

  // Topic actions
  addTopic: (subjectId: string, topic: Partial<Topic>) => Promise<Topic>;
  updateTopic: (id: string, updates: Partial<Topic>) => Promise<Topic>;
  deleteTopic: (id: string) => Promise<void>;
}

const EMPTY = {
  activities: [] as Activity[],
  subjects: [] as Subject[],
  topics: [] as Topic[],
  warnings: [] as OverloadWarning[],
  historyVersion: 0,
  isLoaded: false,
  isLoadingData: false,
  loadError: null as string | null,
};

const findOrThrow = <T extends { id: string }>(items: T[], id: string): T => {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error('Item no longer exists. Please reload the page.');
  return item;
};

const replace = <T extends { id: string }>(items: T[], updated: T) =>
  items.map((i) => (i.id === updated.id ? updated : i));

export const useStore = create<AppState>((set, get) => ({
  ...EMPTY,

  loadAll: async () => {
    set({ isLoadingData: true, loadError: null });
    try {
      const [subjects, topics, activities] = await Promise.all([
        subjectsAPI.getAll(),
        topicsAPI.getAll(),
        activitiesAPI.getAll(),
      ]);
      set((state) => ({
        subjects,
        topics,
        activities,
        isLoaded: true,
        isLoadingData: false,
        historyVersion: state.historyVersion + 1,
      }));
      planningAPI.getWarnings().then((warnings) => set({ warnings }), console.error);
    } catch (error) {
      set({
        isLoadingData: false,
        loadError: error instanceof Error ? error.message : 'Could not load your data.',
      });
    }
  },

  reset: () => set({ ...EMPTY }),

  generatePlan: async (days) => {
    const { sessions, warnings } = await planningAPI.generate(days);
    set((state) => ({ warnings, historyVersion: state.historyVersion + 1 }));
    const activities = await activitiesAPI.getAll();
    set({ activities });
    return sessions.length;
  },

  refreshDerived: async () => {
    // Each part is applied on its own, so one failed read does not throw away the others.
    const [topics, activities, warnings] = await Promise.allSettled([
      topicsAPI.getAll(),
      activitiesAPI.getAll(),
      planningAPI.getWarnings(),
    ]);
    for (const result of [topics, activities, warnings]) {
      if (result.status === 'rejected') console.error(result.reason);
    }
    set({
      ...(topics.status === 'fulfilled' && { topics: topics.value }),
      ...(activities.status === 'fulfilled' && { activities: activities.value }),
      ...(warnings.status === 'fulfilled' && { warnings: warnings.value }),
    });
  },

  addActivity: async (activity) => {
    const created = await activitiesAPI.create(activity);
    set((state) => ({ activities: [...state.activities, created], historyVersion: state.historyVersion + 1 }));
    void get().refreshDerived();
    return created;
  },

  updateActivity: async (id, updates) => {
    const { id: _, ...current } = findOrThrow(get().activities, id);
    const updated = await activitiesAPI.update(id, { ...current, ...updates });
    set((state) => ({ activities: replace(state.activities, updated), historyVersion: state.historyVersion + 1 }));
    void get().refreshDerived();
    return updated;
  },

  setActivityStatus: async (id, status) => {
    const updated = await activitiesAPI.setStatus(id, status);
    set((state) => ({ activities: replace(state.activities, updated), historyVersion: state.historyVersion + 1 }));
    void get().refreshDerived();
    return updated;
  },

  setOccurrenceStatus: async (id, start, status) => {
    await activitiesAPI.setStatus(id, status, start);
    set((state) => ({ historyVersion: state.historyVersion + 1 }));
    await get().refreshDerived();
  },

  deleteActivity: async (id) => {
    await activitiesAPI.remove(id);
    set((state) => ({ activities: state.activities.filter((a) => a.id !== id), historyVersion: state.historyVersion + 1 }));
    void get().refreshDerived();
  },

  deleteSeriesOccurrence: async (id, start) => {
    await activitiesAPI.remove(id, start);
    set((state) => ({ historyVersion: state.historyVersion + 1 }));
  },

  deleteOccurrence: async (id) => {
    await occurrencesAPI.remove(id);
    set((state) => ({ historyVersion: state.historyVersion + 1 }));
  },

  addSubject: async (subject) => {
    const created = await subjectsAPI.create(subject);
    set((state) => ({ subjects: [...state.subjects, created], historyVersion: state.historyVersion + 1 }));
    void get().refreshDerived();
    return created;
  },

  updateSubject: async (id, updates) => {
    const { id: _, ...current } = findOrThrow(get().subjects, id);
    const updated = await subjectsAPI.update(id, { ...current, ...updates });
    set((state) => ({ subjects: replace(state.subjects, updated), historyVersion: state.historyVersion + 1 }));
    void get().refreshDerived();
    return updated;
  },

  // The API deletes the subject's topics and activities as well.
  deleteSubject: async (id) => {
    await subjectsAPI.remove(id);
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
      topics: state.topics.filter((t) => t.subjectId !== id),
      activities: state.activities.filter((a) => a.subjectId !== id),
      historyVersion: state.historyVersion + 1,
    }));
    void get().refreshDerived();
  },

  addTopic: async (subjectId, topic) => {
    const created = await topicsAPI.create(subjectId, topic);
    set((state) => ({ topics: [...state.topics, created], historyVersion: state.historyVersion + 1 }));
    void get().refreshDerived();
    return created;
  },

  updateTopic: async (id, updates) => {
    const current = findOrThrow(get().topics, id);
    const updated = await topicsAPI.update(id, { ...current, ...updates });
    set((state) => ({ topics: replace(state.topics, updated), historyVersion: state.historyVersion + 1 }));
    void get().refreshDerived();
    return updated;
  },

  // Activities linked to the topic stay; the API clears their topic.
  deleteTopic: async (id) => {
    await topicsAPI.remove(id);
    set((state) => ({
      topics: state.topics.filter((t) => t.id !== id),
      activities: state.activities.map((a) => (a.topicId === id ? { ...a, topicId: undefined } : a)),
      historyVersion: state.historyVersion + 1,
    }));
    void get().refreshDerived();
  },
}));
