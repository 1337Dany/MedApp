import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { fakeApi, FakeUser } from '../test/fakeApi';
import { field, findModal, nav, renderApp, setValue } from '../test/render';
import { addDays, startOfDay } from '../utils/dates';
import { addMonths } from '../utils/analytics';

const thisSunday = () => addDays(startOfDay(new Date()), -new Date().getDay());
// A start in the current week that has already passed.
const earlierThisWeek = (hoursAgo: number) =>
  new Date(Math.max(thisSunday().getTime(), Date.now() - hoursAgo * 3_600_000)).toISOString();
const hoursOf = (label: string) => within(screen.getByText(label, { selector: 'td' }).closest('tr')!).getAllByRole('cell')[1];

async function openAnalytics(seed?: (user: FakeUser) => void) {
  const rendered = await renderApp({ seed });
  await screen.findByRole('heading', { name: 'Dashboard' });
  await rendered.events.click(nav('Analytics'));
  await screen.findByText('Time by Activity Type (Hours per Day)');
  return rendered;
}

describe('AnalyticsView', () => {
  it('summarizes study time, completion and knowledge of the week with recommendations', async () => {
    await openAnalytics((user) => {
      const subject = fakeApi.addSubject(user.id);
      fakeApi.addTopic(subject.id, { feedback: 'green' });
      fakeApi.addTopic(subject.id, { feedback: 'red' });
      fakeApi.addActivity(user.id, { status: 'done', durationMinutes: 150, subjectId: subject.id, startTime: earlierThisWeek(6) });
      fakeApi.addActivity(user.id, { status: 'skipped', durationMinutes: 120, startTime: earlierThisWeek(3) });
    });

    expect(screen.getByText('Study Planned').nextElementSibling).toHaveTextContent('4.5 h');
    expect(screen.getByText('Studied').nextElementSibling).toHaveTextContent('2.5 h');
    expect(screen.getByText('Completion Rate').nextElementSibling).toHaveTextContent('50%');
    expect(screen.getByText('Of 2 study sessions so far')).toBeInTheDocument();
    expect(screen.getByText('Topics Mastered').nextElementSibling).toHaveTextContent('1');
    expect(hoursOf('Studying')).toHaveTextContent('4.5');
    expect(screen.getByText('Low Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Many Topics Need Attention')).toBeInTheDocument();
    expect(screen.getByText('Long Study Sessions')).toBeInTheDocument();
  });

  it('asks to plan and track when the week is empty', async () => {
    await openAnalytics();

    expect(screen.getByText('No Study Planned')).toBeInTheDocument();
    expect(screen.getByText('Start Tracking')).toBeInTheDocument();
  });

  it('follows changes to the schedule', async () => {
    const { events } = await openAnalytics((user) => {
      fakeApi.addActivity(user.id, {
        title: 'Sleep',
        activityTypeId: 7,
        durationMinutes: 480,
        startTime: new Date(addDays(thisSunday(), -30).setHours(23)).toISOString(),
        isRecurring: true,
        recurrence: { frequency: 'daily', daysOfWeek: [], until: null },
      });
    });
    expect(hoursOf('Sleep')).toHaveTextContent('56');

    await events.click(nav('Activities'));
    await events.click(screen.getByRole('heading', { name: 'Sleep' }));
    const modal = await findModal('Edit Activity');
    setValue(field('Duration (minutes) *', modal), '420');
    await events.click(within(modal).getByRole('button', { name: 'Update' }));
    await events.click(nav('Analytics'));

    await waitFor(() => expect(hoursOf('Sleep')).toHaveTextContent('49'));
  });

  it('switches between weeks and months', async () => {
    const { events } = await openAnalytics();
    const period = () => screen.getByTestId('analytics-period');
    const monthName = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const sunday = thisSunday();

    expect(period()).toHaveTextContent(sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    expect(screen.getByRole('button', { name: 'This week' })).toBeDisabled();
    await events.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(period()).toHaveTextContent(addDays(sunday, -7).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    await events.click(screen.getByRole('button', { name: 'Month' }));
    const shown = addDays(sunday, -7);
    expect(period()).toHaveTextContent(monthName(shown));
    await events.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(period()).toHaveTextContent(monthName(addMonths(shown, -1)));
    expect(screen.getByText('Study Trend (Last 6 Months, Hours)')).toBeInTheDocument();

    await events.click(screen.getByRole('button', { name: 'This month' }));
    expect(period()).toHaveTextContent(monthName(new Date()));
  });
});
