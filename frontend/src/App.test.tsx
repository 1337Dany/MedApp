import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { fakeApi } from './test/fakeApi';
import { nav, renderApp } from './test/render';
import { tokenStorage } from './services/http';
import { useStore } from './store/useStore';

describe('App shell', () => {
  it('student navigation buttons switch between all five views', async () => {
    const { events } = await renderApp();
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();

    const views: [string, string][] = [
      ['Calendar', 'Weekly Calendar'],
      ['Subjects', 'Subjects & Topics'],
      ['Activities', 'Activities'],
      ['Analytics', 'Analytics'],
      ['Dashboard', 'Dashboard'],
    ];
    for (const [button, heading] of views) {
      await events.click(nav(button));
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
      expect(nav(button)).toHaveClass('bg-blue-50');
    }
  });

  it('teachers only get the class overview', async () => {
    await renderApp({ user: { role: 'teacher' } });

    expect(await screen.findByRole('heading', { name: 'Teacher Dashboard' })).toBeInTheDocument();
    expect(nav('Class Overview')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subjects' })).not.toBeInTheDocument();
    // Staff have no study data, so nothing of theirs is loaded.
    expect(fakeApi.requests.some((r) => r.path === '/subjects')).toBe(false);
  });

  it('admins switch between the class overview and user management', async () => {
    const { events } = await renderApp({ user: { role: 'admin' } });
    await screen.findByRole('heading', { name: 'Teacher Dashboard' });

    await events.click(nav('Users'));
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();

    await events.click(nav('Class Overview'));
    expect(screen.getByRole('heading', { name: 'Teacher Dashboard' })).toBeInTheDocument();
  });

  it('"Try again" reloads the data after a failed load', async () => {
    fakeApi.failNext('GET', /\/api\/subjects$/, 500, { title: 'Database is down.' });
    const { events } = await renderApp();

    expect(await screen.findByText('Database is down.')).toBeInTheDocument();
    await events.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('refreshes an expired access token transparently', async () => {
    await renderApp({
      seed: (user) => {
        fakeApi.addSubject(user.id, { name: 'Pharmacology' });
      },
    });
    await screen.findByRole('heading', { name: 'Dashboard' });
    const oldRefresh = tokenStorage.getRefreshToken();

    fakeApi.expireAccessTokens();
    triggerApiCall();

    await waitFor(() => expect(fakeApi.requests.some((r) => r.path === '/auth/refresh')).toBe(true));
    await waitFor(() => expect(tokenStorage.getRefreshToken()).not.toBe(oldRefresh));
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('returns to sign in when the session cannot be refreshed', async () => {
    await renderApp();
    await screen.findByRole('heading', { name: 'Dashboard' });

    fakeApi.expireAccessTokens();
    fakeApi.failNext('POST', /auth\/refresh/, 401, { title: 'Invalid refresh token.' });
    triggerApiCall();

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});

describe('First visit (InitialSetup)', () => {
  it('"Start Fresh" opens an empty dashboard and is remembered', async () => {
    const { events, user, unmount } = await renderApp({ firstVisit: true });

    await events.click(await screen.findByRole('button', { name: 'Start Fresh' }));

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(localStorage.getItem(`medapp.setupDone.${user.id}`)).toBe('1');
    expect(fakeApi.writes()).toHaveLength(0);
    unmount();
  });

  it('"Start with Demo Data" saves the demo subjects, topics and activities through the API', async () => {
    const { events } = await renderApp({ firstVisit: true });

    await events.click(await screen.findByRole('button', { name: 'Start with Demo Data' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' }, { timeout: 10_000 })).toBeInTheDocument();
    expect(fakeApi.writes(/^\/subjects$/)).toHaveLength(4);
    expect(fakeApi.writes(/^\/subjects\/.+\/topics$/)).toHaveLength(17);
    expect(fakeApi.writes(/^\/activities$/)).toHaveLength(13);
    // Activities reference the ids the server assigned.
    const lecture = fakeApi.activities.find((a) => a.title === 'Anatomy Lecture')!;
    expect(fakeApi.subjects.find((s) => s.id === lecture.subjectId)?.name).toBe('Anatomy');
    expect(screen.getByText('Total Subjects').nextElementSibling).toHaveTextContent('4');
  });

  it('shows the error and keeps both buttons when the demo data cannot be saved', async () => {
    fakeApi.failNext('POST', /\/api\/subjects$/, 500, { title: 'Could not save.' });
    const { events } = await renderApp({ firstVisit: true });

    await events.click(await screen.findByRole('button', { name: 'Start with Demo Data' }));

    expect(await screen.findByText('Could not save.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start with Demo Data' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Start Fresh' })).toBeEnabled();
  });
});

// Sends authenticated requests the way the app does after any change.
function triggerApiCall() {
  void useStore.getState().refreshDerived();
}
