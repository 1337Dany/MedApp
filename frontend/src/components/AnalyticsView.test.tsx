import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { fakeApi, FakeUser } from '../test/fakeApi';
import { field, findModal, nav, renderApp, setValue } from '../test/render';
import { addDays, startOfDay } from '../utils/dates';
import { addMonths } from '../utils/analytics';

const dayLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

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

  it('reports a single day, stepping by days and switching back to the period around it', async () => {
    const { events } = await openAnalytics();
    const period = () => screen.getByTestId('analytics-period');
    const today = startOfDay(new Date());

    await events.click(screen.getByRole('button', { name: 'Day' }));
    expect(period()).toHaveTextContent(dayLabel(today));
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();
    expect(await screen.findByText('Study Trend (Last 14 Days, Hours)')).toBeInTheDocument();
    expect(screen.getByText('Time by Activity Type (Hours)')).toBeInTheDocument();
    expect(screen.getByText(/no study sessions on this day/i)).toBeInTheDocument();

    await events.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(period()).toHaveTextContent(dayLabel(addDays(today, -1)));
    expect(screen.getByRole('button', { name: 'Today' })).toBeEnabled();
    await events.click(screen.getByRole('button', { name: 'Next day' }));
    await events.click(screen.getByRole('button', { name: 'Next day' }));
    expect(period()).toHaveTextContent(dayLabel(addDays(today, 1)));

    await events.click(screen.getByRole('button', { name: 'Previous day' }));
    await events.click(screen.getByRole('button', { name: 'Today' }));
    expect(period()).toHaveTextContent(dayLabel(today));

    // Week -> Day goes to the period's start unless the period is the current one.
    await events.click(screen.getByRole('button', { name: 'Week' }));
    await events.click(screen.getByRole('button', { name: 'Previous week' }));
    await events.click(screen.getByRole('button', { name: 'Day' }));
    expect(period()).toHaveTextContent(dayLabel(addDays(thisSunday(), -7)));
  });

  it('counts only the chosen day and asks for it with a range below the API limit', async () => {
    const today = startOfDay(new Date());
    const { events } = await openAnalytics((user) => {
      fakeApi.addActivity(user.id, { durationMinutes: 90, startTime: new Date(addDays(today, -1).setHours(10)).toISOString() });
      fakeApi.addActivity(user.id, { durationMinutes: 30, startTime: new Date(addDays(today, -2).setHours(10)).toISOString() });
    });

    await events.click(screen.getByRole('button', { name: 'Day' }));
    await events.click(screen.getByRole('button', { name: 'Previous day' }));

    await waitFor(() => expect(screen.getByText('Study Planned').nextElementSibling).toHaveTextContent('1.5 h'));
    expect(hoursOf('Studying')).toHaveTextContent('1.5');
    const lastRead = fakeApi.requests.filter((r) => r.path.startsWith('/occurrences')).at(-1)!;
    const query = new URLSearchParams(lastRead.path.split('?')[1]);
    expect(new Date(query.get('from')!)).toEqual(addDays(today, -14));
    expect(new Date(query.get('to')!)).toEqual(today);
  });

  it('judges the sleep of one day by the nights that begin on it', async () => {
    const { events } = await openAnalytics((user) => {
      fakeApi.addActivity(user.id, {
        title: 'Night',
        activityTypeId: 7,
        durationMinutes: 480,
        startTime: new Date(addDays(startOfDay(new Date()), -1).setHours(23)).toISOString(),
      });
    });

    await events.click(screen.getByRole('button', { name: 'Day' }));
    await events.click(screen.getByRole('button', { name: 'Previous day' }));

    await waitFor(() => expect(hoursOf('Sleep')).toHaveTextContent('1'));
    expect(screen.queryByText('Little Sleep Scheduled')).not.toBeInTheDocument();
  });

  it('picks an exact date in the calendar popover', async () => {
    const { events } = await openAnalytics();
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const trigger = screen.getByRole('button', { name: 'Pick a date' });
    expect(within(trigger).getByTestId('analytics-period')).toBeInTheDocument();
    await events.click(trigger);
    const picker = await screen.findByRole('dialog');
    const days = within(picker).getAllByRole('gridcell', { name: '1' });
    // A month view can also show the first of the next month as an outside day.
    await events.click(days[0]);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('analytics-period')).toHaveTextContent(dayLabel(firstOfMonth));
    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute('aria-pressed', 'true');

    // Keyboard: the focus returns to the trigger, which opens it again, and Escape closes it.
    expect(screen.getByRole('button', { name: 'Pick a date' })).toHaveFocus();
    await events.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await events.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the report on a failed refresh, says so and can try again', async () => {
    const { events } = await openAnalytics();
    fakeApi.failNext('GET', /occurrences/, 500);

    await events.click(screen.getByRole('button', { name: 'Week' }));
    await events.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');

    await events.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByText('Time by Activity Type (Hours per Day)')).toBeInTheDocument();
  });

  it('names both years for a week over New Year', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 0, 1, 12) });
    try {
      await openAnalytics();
      expect(screen.getByTestId('analytics-period')).toHaveTextContent('Dec 28, 2025 - Jan 3, 2026');
    } finally {
      vi.useRealTimers();
    }
  });

  it('says so when there is nothing to flag', async () => {
    const yesterday = addDays(startOfDay(new Date()), -1);
    const { events } = await openAnalytics((user) => {
      fakeApi.addActivity(user.id, { status: 'done', startTime: new Date(yesterday.getTime() + 10 * 3_600_000).toISOString() });
    });

    await events.click(screen.getByRole('button', { name: 'Day' }));
    await events.click(screen.getByRole('button', { name: 'Previous day' }));

    expect(await screen.findByText('Nothing to flag.')).toBeInTheDocument();
  });
});
