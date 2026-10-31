import { describe, expect, it } from 'vitest';
import { fakeApi } from '../test/fakeApi';
import { tokenStorage } from '../services/http';
import { useStore } from './useStore';

function signedIn() {
  const user = fakeApi.addUser();
  tokenStorage.setTokens(fakeApi.issueTokens(user.id));
  return user;
}

const version = () => useStore.getState().historyVersion;

describe('useStore', () => {
  it('bumps historyVersion after each write that can change the occurrences', async () => {
    const user = signedIn();
    const subject = fakeApi.addSubject(user.id);
    const activity = fakeApi.addActivity(user.id, {
      startTime: new Date(Date.now() - 86_400_000).toISOString().replace(/\.\d+Z/, '.000Z'),
      isRecurring: true,
      recurrence: { frequency: 'daily', daysOfWeek: [], until: null },
      subjectId: subject.id,
    });
    await useStore.getState().loadAll();
    const store = useStore.getState();

    const writes: (() => Promise<unknown>)[] = [
      () => store.setOccurrenceStatus(activity.id, new Date(activity.startTime), 'done'),
      () => store.updateActivity(activity.id, { title: 'Renamed' }),
      () => store.setActivityStatus(activity.id, 'skipped'),
      () => store.generatePlan(7),
      () => store.addSubject({ title: 'Physiology' } as never),
      () => store.updateSubject(subject.id, { title: 'Anatomy 2' }),
      () => store.addTopic(subject.id, { title: 'Heart' }),
      () => store.deleteActivity(activity.id),
      () => store.deleteSubject(subject.id),
    ];
    for (const write of writes) {
      const before = version();
      await write();
      expect(version()).toBe(before + 1);
    }
  });

  it('does not bump historyVersion for a failed write', async () => {
    const user = signedIn();
    const activity = fakeApi.addActivity(user.id);
    await useStore.getState().loadAll();
    const before = version();
    fakeApi.failNext('DELETE', /activities/, 500);

    await expect(useStore.getState().deleteActivity(activity.id)).rejects.toThrow();

    expect(version()).toBe(before);
  });

  it('applies what a refresh could read when another part fails', async () => {
    const user = signedIn();
    await useStore.getState().loadAll();
    fakeApi.addActivity(user.id, { title: 'New' });
    fakeApi.failNext('GET', /planning\/warnings/, 500);

    await useStore.getState().refreshDerived();

    expect(useStore.getState().activities.map((a) => a.title)).toEqual(['New']);
  });
});
