import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { fakeApi, FakeUser } from '../test/fakeApi';
import { field, findModal, renderApp } from '../test/render';
import { addDays, toDateInputValue } from '../utils/dates';

const inDays = (days: number) => toDateInputValue(addDays(new Date(), days));

// A subject the planner can schedule: automatic strategy and an upcoming exam.
const plannable = (user: FakeUser) =>
  fakeApi.addSubject(user.id, { name: 'Biochemistry', planningMethodId: 1, examDate: inDays(20) });

describe('Dashboard', () => {
  it('shows the stats, urgent subjects, upcoming exams and planner warnings', async () => {
    fakeApi.warnings = [
      { date: inDays(1), severity: 'high', message: 'Tomorrow is overloaded.', suggestions: ['Move a session'] },
    ];
    await renderApp({
      seed: (user) => {
        const subject = fakeApi.addSubject(user.id, { name: 'Anatomy', studyMode: 'emergency', examDate: inDays(10) });
        fakeApi.addTopic(subject.id, { feedback: 'green' });
        fakeApi.addTopic(subject.id, { feedback: 'red' });
        fakeApi.addActivity(user.id, { status: 'done' });
      },
    });

    expect(await screen.findByText('Tomorrow is overloaded.')).toBeInTheDocument();
    expect(screen.getByText('• Move a session')).toBeInTheDocument();
    expect(screen.getByText('• Anatomy (emergency)')).toBeInTheDocument();
    expect(screen.getByText("Today's Activities").nextElementSibling).toHaveTextContent('1/1');
    expect(screen.getByText('Total Topics').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Well Known').nextElementSibling).toHaveTextContent('50%');
    expect(screen.getByText('emergency mode')).toBeInTheDocument();
  });

  describe('Study Planner', () => {
    it('"Plan Sessions" plans the chosen horizon and reports the result', async () => {
      const { events } = await renderApp({ seed: plannable });
      await screen.findByRole('heading', { name: 'Dashboard' });

      await events.selectOptions(screen.getByRole('combobox', { name: 'Planning horizon' }), '14');
      await events.click(screen.getByRole('button', { name: 'Plan Sessions' }));

      expect(await screen.findByText('Planned 2 study sessions for the next 14 days.')).toBeInTheDocument();
      expect(fakeApi.writes(/planning\/generate/)[0].body).toEqual({
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        days: 14,
      });
      // The button and the summary now reflect the existing plan.
      expect(screen.getByRole('button', { name: 'Re-plan' })).toBeInTheDocument();
      expect(screen.getByText(/2 planned sessions ahead/)).toBeInTheDocument();
    });

    it('explains why nothing was planned', async () => {
      const { events } = await renderApp();
      await screen.findByRole('heading', { name: 'Dashboard' });

      await events.click(screen.getByRole('button', { name: 'Plan Sessions' }));

      expect(await screen.findByText(/Nothing to plan/)).toBeInTheDocument();
    });

    it('shows the API error when planning fails', async () => {
      fakeApi.failNext('POST', /planning\/generate/, 400, { errors: { TimeZone: ['Unknown time zone.'] } });
      const { events } = await renderApp();
      await screen.findByRole('heading', { name: 'Dashboard' });

      await events.click(screen.getByRole('button', { name: 'Plan Sessions' }));

      expect(await screen.findByText('Unknown time zone.')).toHaveClass('text-red-700');
      expect(screen.getByRole('button', { name: 'Plan Sessions' })).toBeEnabled();
    });
  });

  describe('Quick Actions', () => {
    it('"Add Subject" opens the subject form and the new subject is counted', async () => {
      const { events } = await renderApp();
      await screen.findByRole('heading', { name: 'Dashboard' });

      await events.click(screen.getByRole('button', { name: /Add Subject/ }));
      const modal = await findModal('New Subject');
      await events.type(field('Subject Name *', modal), 'Histology');
      await events.click(within(modal).getByRole('button', { name: 'Create' }));

      expect(screen.queryByRole('heading', { name: 'New Subject' })).not.toBeInTheDocument();
      expect(screen.getByText('Total Subjects').nextElementSibling).toHaveTextContent('1');
    });

    it('"Add Activity" opens the activity form and saves the activity', async () => {
      const { events } = await renderApp();
      await screen.findByRole('heading', { name: 'Dashboard' });

      await events.click(screen.getByRole('button', { name: /Add Activity/ }));
      const modal = await findModal('New Activity');
      await events.type(field('Title *', modal), 'Read chapter 3');
      await events.click(within(modal).getByRole('button', { name: 'Create' }));

      expect(screen.queryByRole('heading', { name: 'New Activity' })).not.toBeInTheDocument();
      expect(fakeApi.activities.map((a) => a.title)).toEqual(['Read chapter 3']);
    });

    it('"View Calendar" opens the calendar', async () => {
      const { events } = await renderApp();
      await screen.findByRole('heading', { name: 'Dashboard' });

      await events.click(screen.getByRole('button', { name: /View Calendar/ }));

      expect(screen.getByRole('heading', { name: 'Weekly Calendar' })).toBeInTheDocument();
    });

    it('"Plan My Week" plans the next 7 days whatever horizon is selected', async () => {
      const { events } = await renderApp({ seed: plannable });
      await screen.findByRole('heading', { name: 'Dashboard' });

      await events.selectOptions(screen.getByRole('combobox', { name: 'Planning horizon' }), '28');
      await events.click(screen.getByRole('button', { name: /Plan My Week/ }));

      expect(await screen.findByText('Planned 2 study sessions for the next 7 days.')).toBeInTheDocument();
      expect(fakeApi.writes(/planning\/generate/)[0].body.days).toBe(7);
    });
  });
});
