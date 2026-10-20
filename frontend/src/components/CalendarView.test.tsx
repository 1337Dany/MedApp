import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { fakeApi, FakeUser } from '../test/fakeApi';
import { field, findModal, nav, renderApp } from '../test/render';
import { addDays, startOfDay, toDateInputValue } from '../utils/dates';

const thisSunday = () => addDays(startOfDay(new Date()), -new Date().getDay());
const weekRange = (sunday: Date) =>
  `${sunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${addDays(sunday, 6).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;
const atLocal = (day: Date, hours: number) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours).toISOString();

async function openCalendar(seed?: (user: FakeUser) => void) {
  const rendered = await renderApp({ seed });
  await screen.findByRole('heading', { name: 'Dashboard' });
  await rendered.events.click(nav('Calendar'));
  return rendered;
}

describe('CalendarView', () => {
  it('"Previous week", "Next week" and "Today" move the displayed week', async () => {
    const { events } = await openCalendar();
    const sunday = thisSunday();
    expect(screen.getByText(weekRange(sunday))).toBeInTheDocument();

    await events.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByText(weekRange(addDays(sunday, 7)))).toBeInTheDocument();
    await events.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByText(weekRange(addDays(sunday, 14)))).toBeInTheDocument();

    await events.click(screen.getByRole('button', { name: 'Previous week' }));
    await events.click(screen.getByRole('button', { name: 'Previous week' }));
    await events.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByText(weekRange(addDays(sunday, -7)))).toBeInTheDocument();

    await events.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText(weekRange(sunday))).toBeInTheDocument();
  });

  it('shows one-off activities and every occurrence of a recurring series in this week', async () => {
    const sunday = thisSunday();
    await openCalendar((user) => {
      fakeApi.addActivity(user.id, { title: 'Exam prep', startTime: atLocal(addDays(sunday, 2), 10) });
      fakeApi.addActivity(user.id, {
        title: 'Lecture',
        activityTypeId: 2,
        startTime: atLocal(addDays(sunday, -14), 9),
        isRecurring: true,
        recurrence: { frequency: 'weekly', daysOfWeek: ['monday', 'thursday'], until: null },
      });
    });

    expect(within(screen.getByTestId('slot-2-10')).getByText('Exam prep')).toBeInTheDocument();
    expect(within(screen.getByTestId('slot-1-9')).getByText('Lecture')).toBeInTheDocument();
    expect(within(screen.getByTestId('slot-4-9')).getByText('Lecture')).toBeInTheDocument();
    expect(screen.getAllByText('Lecture')).toHaveLength(2);
  });

  it('clicking an empty slot opens a new activity at that day and hour', async () => {
    const { events } = await openCalendar();
    const wednesday = addDays(thisSunday(), 3);

    await events.click(screen.getByTestId('slot-3-14'));
    const modal = await findModal('New Activity');

    expect(field('Date *', modal)).toHaveValue(toDateInputValue(wednesday));
    expect(field('Time *', modal)).toHaveValue('14:00');

    await events.type(field('Title *', modal), 'Pharmacology');
    await events.click(within(modal).getByRole('button', { name: 'Create' }));

    expect(fakeApi.writes(/^\/activities$/)[0].body.startTime).toBe(atLocal(wednesday, 14));
    expect(within(screen.getByTestId('slot-3-14')).getByText('Pharmacology')).toBeInTheDocument();
  });

  it('clicking an activity opens it for editing instead of creating a new one', async () => {
    const sunday = thisSunday();
    const { events } = await openCalendar((user) =>
      fakeApi.addActivity(user.id, { title: 'Exam prep', startTime: atLocal(addDays(sunday, 2), 10) }),
    );

    await events.click(screen.getByText('Exam prep'));
    const modal = await findModal('Edit Activity');

    expect(field('Title *', modal)).toHaveValue('Exam prep');
    expect(screen.queryByRole('heading', { name: 'New Activity' })).not.toBeInTheDocument();
  });

  it('shows activities of other weeks after navigating there', async () => {
    const nextWeekFriday = addDays(thisSunday(), 12);
    const { events } = await openCalendar((user) =>
      fakeApi.addActivity(user.id, { title: 'Next week task', startTime: atLocal(nextWeekFriday, 8) }),
    );
    expect(screen.queryByText('Next week task')).not.toBeInTheDocument();

    await events.click(screen.getByRole('button', { name: 'Next week' }));

    expect(within(screen.getByTestId('slot-5-8')).getByText('Next week task')).toBeInTheDocument();
  });
});
