import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { fakeApi } from '../test/fakeApi';
import { nav, renderApp } from '../test/render';

describe('TeacherDashboard', () => {
  it('explains that analytics need enough consenting students', async () => {
    await renderApp({ user: { role: 'teacher' } });

    expect(await screen.findByText('Not enough data yet')).toBeInTheDocument();
    expect(screen.getByText(/at least 5 students share their data/)).toBeInTheDocument();
  });

  it('shows the class aggregates and the insights derived from them', async () => {
    fakeApi.analytics = {
      insufficientData: false,
      minimumGroupSize: 5,
      totalStudents: 12,
      averageCompletionRate: 74,
      studentsAtRisk: 2,
      activeSubjects: 3,
      weeklyEngagement: [
        { week: 'Week of Sep 14', weekStart: '2026-09-14', avgStudyHours: 6, avgCompletionRate: 60 },
        { week: 'Week of Oct 12', weekStart: '2026-10-12', avgStudyHours: 8, avgCompletionRate: 75 },
      ],
      subjectPerformance: [
        { subject: 'Anatomy', students: 10, avgKnowledge: 45, studentsStruggling: 4 },
        { subject: 'Physiology', students: 8, avgKnowledge: 80, studentsStruggling: 0 },
      ],
    };
    await renderApp({ user: { role: 'teacher' } });

    expect(await screen.findByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('Total Students').nextElementSibling).toHaveTextContent('12');
    expect(screen.getByText('Avg Completion Rate').nextElementSibling).toHaveTextContent('74%');
    expect(screen.getByText('Students at Risk').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Active Subjects').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Anatomy Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('Strong Physiology Performance')).toBeInTheDocument();
    expect(screen.getByText(/increased by 15 percentage points since Sep 14/)).toBeInTheDocument();
    expect(screen.getByText(/2 students show a completion rate below 60%/)).toBeInTheDocument();
  });

  it('"Try again" reloads the analytics after an error', async () => {
    fakeApi.failNext('GET', /teacher\/analytics/, 500, { title: 'Analytics are unavailable.' });
    const { events } = await renderApp({ user: { role: 'teacher' } });

    expect(await screen.findByText('Analytics are unavailable.')).toBeInTheDocument();
    await events.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Not enough data yet')).toBeInTheDocument();
  });
});

describe('UsersView (admin)', () => {
  async function openUsers() {
    const rendered = await renderApp({
      user: { role: 'admin', firstName: 'Site', lastName: 'Admin' },
      seed: () => {
        fakeApi.addUser({ firstName: 'Alice', lastName: 'Student', email: 'alice@example.com' });
        fakeApi.addUser({ firstName: 'Carol', lastName: 'Teacher', email: 'carol@example.com', role: 'teacher' });
      },
    });
    await screen.findByRole('heading', { name: 'Teacher Dashboard' });
    await rendered.events.click(nav('Users'));
    await screen.findByText('alice@example.com');
    return rendered;
  }

  it('lists every user with their role; the own role cannot be changed', async () => {
    await openUsers();

    expect(screen.getByRole('combobox', { name: 'Role of Alice Student' })).toHaveValue('student');
    expect(screen.getByRole('combobox', { name: 'Role of Carol Teacher' })).toHaveValue('teacher');
    expect(screen.getByRole('combobox', { name: 'Role of Site Admin' })).toBeDisabled();
  });

  it('changing the role select grants and removes roles', async () => {
    const { events } = await openUsers();
    const alice = fakeApi.users.find((u) => u.email === 'alice@example.com')!;

    await events.selectOptions(screen.getByRole('combobox', { name: 'Role of Alice Student' }), 'teacher');
    await waitFor(() => expect(alice.role).toBe('teacher'));
    expect(fakeApi.writes()[0]).toMatchObject({ method: 'PUT', path: `/users/${alice.id}/role`, body: { role: 'teacher' } });
    expect(screen.getByRole('combobox', { name: 'Role of Alice Student' })).toHaveValue('teacher');

    await events.selectOptions(screen.getByRole('combobox', { name: 'Role of Carol Teacher' }), 'student');
    await waitFor(() => expect(fakeApi.writes()[1].body).toEqual({ role: 'user' }));
    expect(screen.getByRole('combobox', { name: 'Role of Carol Teacher' })).toHaveValue('student');
  });

  it('shows the API error and keeps the old role when the change fails', async () => {
    fakeApi.failNext('PUT', /users\/.+\/role/, 400, { title: 'You cannot change this role.' });
    const { events } = await openUsers();

    await events.selectOptions(screen.getByRole('combobox', { name: 'Role of Alice Student' }), 'admin');

    expect(await screen.findByText('You cannot change this role.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role of Alice Student' })).toHaveValue('student');
    expect(screen.getByRole('combobox', { name: 'Role of Alice Student' })).toBeEnabled();
  });
});

describe('AnalyticsView (student)', () => {
  it('summarizes completion, study time and knowledge with recommendations', async () => {
    const { events } = await renderApp({
      seed: (user) => {
        const subject = fakeApi.addSubject(user.id);
        fakeApi.addTopic(subject.id, { feedback: 'green' });
        fakeApi.addTopic(subject.id, { feedback: 'red' });
        fakeApi.addActivity(user.id, { status: 'done', durationMinutes: 150, subjectId: subject.id });
        fakeApi.addActivity(user.id, { status: 'skipped' });
      },
    });
    await screen.findByRole('heading', { name: 'Dashboard' });

    await events.click(nav('Analytics'));

    expect(screen.getByText('Completion Rate').nextElementSibling).toHaveTextContent('50%');
    expect(screen.getByText('1 of 2 activities')).toBeInTheDocument();
    expect(screen.getByText('Avg. Study Session').nextElementSibling).toHaveTextContent('150 min');
    expect(screen.getByText('Topics Mastered').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Low Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Many Topics Need Attention')).toBeInTheDocument();
    expect(screen.getByText('Long Study Sessions')).toBeInTheDocument();
  });

  it('asks to complete activities when nothing is done yet', async () => {
    const { events } = await renderApp();
    await screen.findByRole('heading', { name: 'Dashboard' });

    await events.click(nav('Analytics'));

    expect(screen.getByText('Start Tracking')).toBeInTheDocument();
  });
});
