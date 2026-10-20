import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { fakeApi, FakeUser } from '../test/fakeApi';
import { field, findModal, nav, renderApp, setValue } from '../test/render';
import { toDateInputValue } from '../utils/dates';

async function openActivities(seed?: (user: FakeUser) => void) {
  const rendered = await renderApp({ seed });
  await screen.findByRole('heading', { name: 'Dashboard' });
  await rendered.events.click(nav('Activities'));
  return rendered;
}

const at = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();

const withSchedule = (user: FakeUser) => {
  fakeApi.addActivity(user.id, { title: 'Morning run', activityTypeId: 4, startTime: at('2026-10-20', '07:00'), status: 'done' });
  fakeApi.addActivity(user.id, { title: 'Lecture', activityTypeId: 2, startTime: at('2026-10-20', '09:00'), isNegotiable: false });
  fakeApi.addActivity(user.id, { title: 'Gym', activityTypeId: 4, startTime: at('2026-10-19', '18:00'), status: 'skipped' });
  fakeApi.addActivity(user.id, {
    title: 'Planned review',
    startTime: at('2026-10-21', '16:00'),
    status: 'partiallyDone',
    isAutoPlanned: true,
    notes: 'Glycolysis',
  });
};

const titles = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('ActivitiesView', () => {
  it('lists activities by start time with their badges', async () => {
    await openActivities(withSchedule);

    expect(titles()).toEqual(['Gym', 'Morning run', 'Lecture', 'Planned review']);
    const lecture = screen.getByRole('heading', { name: 'Lecture' }).parentElement!;
    expect(within(lecture).getByText('Class')).toBeInTheDocument();
    expect(within(lecture).getByText('Non-negotiable')).toBeInTheDocument();
    expect(screen.getByText('Auto-planned')).toBeInTheDocument();
    expect(screen.getByText('Glycolysis')).toBeInTheDocument();
  });

  it('the filter buttons show all, scheduled, completed and skipped activities', async () => {
    const { events } = await openActivities(withSchedule);

    await events.click(screen.getByRole('button', { name: 'Scheduled' }));
    expect(titles()).toEqual(['Lecture']);
    expect(screen.getByRole('button', { name: 'Scheduled' })).toHaveClass('bg-blue-600');

    await events.click(screen.getByRole('button', { name: 'Completed' }));
    expect(titles()).toEqual(['Morning run']);

    await events.click(screen.getByRole('button', { name: 'Skipped' }));
    expect(titles()).toEqual(['Gym']);

    await events.click(screen.getByRole('button', { name: 'All' }));
    expect(titles()).toHaveLength(4);
  });

  it('shows the empty state for the selected filter', async () => {
    const { events } = await openActivities();
    expect(screen.getByText(/No activities yet/)).toBeInTheDocument();

    await events.click(screen.getByRole('button', { name: 'Skipped' }));
    expect(screen.getByText('No skipped activities.')).toBeInTheDocument();
  });
});

describe('ActivityModal', () => {
  it('"Add Activity" opens an empty form with the defaults', async () => {
    const { events } = await openActivities();

    await events.click(screen.getByRole('button', { name: 'Add Activity' }));
    const modal = await findModal('New Activity');

    expect(field('Type *', modal)).toHaveValue('studying');
    expect(field('Status', modal)).toHaveValue('scheduled');
    expect(field('Date *', modal)).toHaveValue(toDateInputValue(new Date()));
    expect(field('Time *', modal)).toHaveValue('09:00');
    expect(field('Duration (minutes) *', modal)).toHaveValue(60);
    expect(field('Priority (1-5)', modal)).toHaveValue(3);
    expect(within(modal).getByLabelText('Negotiable')).toBeChecked();
    expect(within(modal).getByLabelText('Recurring')).not.toBeChecked();
    expect(within(modal).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('"Create" saves a study session for a subject topic with every field', async () => {
    const { events } = await openActivities((user) => {
      const subject = fakeApi.addSubject(user.id, { name: 'Biochemistry' });
      fakeApi.addTopic(subject.id, { title: 'Krebs cycle' });
    });
    const [subject] = fakeApi.subjects;
    const [topic] = fakeApi.topics;

    await events.click(screen.getByRole('button', { name: 'Add Activity' }));
    const modal = await findModal('New Activity');
    await events.type(field('Title *', modal), 'Krebs review');
    await events.selectOptions(field('Status', modal), 'partial');
    await events.selectOptions(field('Subject', modal), subject.id);
    await events.selectOptions(field('Topic', modal), topic.id);
    setValue(field('Date *', modal), '2026-11-02');
    setValue(field('Time *', modal), '14:30');
    await events.clear(field('Duration (minutes) *', modal));
    await events.type(field('Duration (minutes) *', modal), '90');
    await events.click(within(modal).getByLabelText('Negotiable'));
    await events.clear(field('Priority (1-5)', modal));
    await events.type(field('Priority (1-5)', modal), '5');
    await events.type(field('Notes', modal), 'Bring flashcards');
    await events.click(within(modal).getByRole('button', { name: 'Create' }));

    expect(fakeApi.writes(/^\/activities$/)[0].body).toEqual({
      subjectId: subject.id,
      topicId: topic.id,
      title: 'Krebs review',
      activityTypeId: 1,
      priority: 5,
      startTime: at('2026-11-02', '14:30'),
      durationMinutes: 90,
      isRecurring: false,
      recurrence: null,
      isNegotiable: false,
      notes: 'Bring flashcards',
      status: 'partiallyDone',
    });
    expect(screen.queryByRole('heading', { name: 'New Activity' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Krebs review' })).toBeInTheDocument();
  });

  it('the subject and topic pickers follow the activity type', async () => {
    const { events } = await openActivities((user) => {
      const subject = fakeApi.addSubject(user.id, { name: 'Anatomy' });
      fakeApi.addTopic(subject.id, { title: 'Heart' });
    });

    await events.click(screen.getByRole('button', { name: 'Add Activity' }));
    const modal = await findModal('New Activity');
    expect(within(modal).queryByText('Topic', { selector: 'label' })).not.toBeInTheDocument();

    await events.selectOptions(field('Subject', modal), fakeApi.subjects[0].id);
    expect(field('Topic', modal)).toHaveValue('');

    // Classes belong to a subject but not to a topic.
    await events.selectOptions(field('Type *', modal), 'class');
    expect(field('Subject', modal)).toHaveValue(fakeApi.subjects[0].id);
    expect(within(modal).queryByText('Topic', { selector: 'label' })).not.toBeInTheDocument();

    // Other types have neither, and a subject chosen earlier is not sent.
    await events.selectOptions(field('Type *', modal), 'meal');
    expect(within(modal).queryByText('Subject', { selector: 'label' })).not.toBeInTheDocument();
    await events.type(field('Title *', modal), 'Lunch');
    await events.click(within(modal).getByRole('button', { name: 'Create' }));

    expect(fakeApi.writes(/^\/activities$/)[0].body).toMatchObject({ activityTypeId: 6, subjectId: null, topicId: null });
  });

  it('weekly recurrence: day buttons toggle and are sent with the end date', async () => {
    const { events } = await openActivities();

    await events.click(screen.getByRole('button', { name: 'Add Activity' }));
    const modal = await findModal('New Activity');
    await events.type(field('Title *', modal), 'Anatomy lecture');
    await events.selectOptions(field('Type *', modal), 'class');
    await events.click(within(modal).getByLabelText('Recurring'));
    expect(field('Frequency', modal)).toHaveValue('weekly');

    for (const day of ['Monday', 'Wednesday', 'Friday', 'Sunday']) {
      await events.click(within(modal).getByRole('button', { name: day }));
    }
    await events.click(within(modal).getByRole('button', { name: 'Sunday' }));
    expect(within(modal).getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(modal).getByRole('button', { name: 'Sunday' })).toHaveAttribute('aria-pressed', 'false');

    setValue(field('Repeat until (optional)', modal), '2026-12-20');
    await events.click(within(modal).getByRole('button', { name: 'Create' }));

    const { body } = fakeApi.writes(/^\/activities$/)[0];
    expect(body.isRecurring).toBe(true);
    expect(body.recurrence).toEqual({ frequency: 'weekly', daysOfWeek: ['monday', 'wednesday', 'friday'], until: '2026-12-20' });
    expect(screen.getByText('Recurring')).toBeInTheDocument();
  });

  it('a weekly series needs at least one day', async () => {
    const { events } = await openActivities();

    await events.click(screen.getByRole('button', { name: 'Add Activity' }));
    const modal = await findModal('New Activity');
    await events.type(field('Title *', modal), 'Gym');
    await events.click(within(modal).getByLabelText('Recurring'));
    await events.click(within(modal).getByRole('button', { name: 'Create' }));

    expect(within(modal).getByText('Pick at least one day for a weekly activity.')).toBeInTheDocument();
    expect(fakeApi.writes()).toHaveLength(0);
  });

  it('daily recurrence hides the day buttons and sends no days', async () => {
    const { events } = await openActivities();

    await events.click(screen.getByRole('button', { name: 'Add Activity' }));
    const modal = await findModal('New Activity');
    await events.type(field('Title *', modal), 'Sleep');
    await events.selectOptions(field('Type *', modal), 'sleep');
    await events.click(within(modal).getByLabelText('Recurring'));
    await events.selectOptions(field('Frequency', modal), 'daily');
    expect(within(modal).queryByRole('button', { name: 'Monday' })).not.toBeInTheDocument();
    await events.click(within(modal).getByRole('button', { name: 'Create' }));

    expect(fakeApi.writes(/^\/activities$/)[0].body.recurrence).toEqual({ frequency: 'daily', daysOfWeek: [], until: null });
  });

  it('clicking an activity opens it prefilled and "Update" saves the changes', async () => {
    const { events } = await openActivities((user) =>
      fakeApi.addActivity(user.id, {
        title: 'Gym',
        activityTypeId: 4,
        startTime: at('2026-10-20', '18:00'),
        durationMinutes: 45,
        isRecurring: true,
        recurrence: { frequency: 'weekly', daysOfWeek: ['tuesday'], until: null },
      }),
    );

    await events.click(screen.getByRole('heading', { name: 'Gym' }));
    const modal = await findModal('Edit Activity');
    expect(field('Title *', modal)).toHaveValue('Gym');
    expect(field('Type *', modal)).toHaveValue('sport');
    expect(field('Date *', modal)).toHaveValue('2026-10-20');
    expect(field('Time *', modal)).toHaveValue('18:00');
    expect(field('Duration (minutes) *', modal)).toHaveValue(45);
    expect(within(modal).getByRole('button', { name: 'Tuesday' })).toHaveAttribute('aria-pressed', 'true');

    await events.selectOptions(field('Status', modal), 'done');
    await events.click(within(modal).getByLabelText('Recurring'));
    await events.click(within(modal).getByRole('button', { name: 'Update' }));

    const [request] = fakeApi.writes();
    expect(request.method).toBe('PUT');
    expect(request.body).toMatchObject({ title: 'Gym', status: 'done', isRecurring: false, recurrence: null });
    expect(screen.queryByText('Recurring')).not.toBeInTheDocument();

    await events.click(screen.getByRole('button', { name: 'Completed' }));
    expect(titles()).toEqual(['Gym']);
  });

  it('"Delete" removes the activity after confirmation', async () => {
    const { events } = await openActivities((user) => fakeApi.addActivity(user.id, { title: 'Gym' }));

    await events.click(screen.getByRole('heading', { name: 'Gym' }));
    const modal = await findModal('Edit Activity');
    await events.click(within(modal).getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this activity?');
    expect(fakeApi.writes()[0].method).toBe('DELETE');
    expect(screen.queryByRole('heading', { name: 'Edit Activity' })).not.toBeInTheDocument();
    expect(screen.getByText(/No activities yet/)).toBeInTheDocument();
  });

  it('"Delete" does nothing when the confirmation is cancelled', async () => {
    const { events } = await openActivities((user) => fakeApi.addActivity(user.id, { title: 'Gym' }));
    vi.mocked(window.confirm).mockReturnValueOnce(false);

    await events.click(screen.getByRole('heading', { name: 'Gym' }));
    const modal = await findModal('Edit Activity');
    await events.click(within(modal).getByRole('button', { name: 'Delete' }));

    expect(fakeApi.writes()).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Edit Activity' })).toBeInTheDocument();
  });

  it('"Delete" shows the API error and keeps the form open', async () => {
    fakeApi.failNext('DELETE', /activities\//, 500, { title: 'Could not delete.' });
    const { events } = await openActivities((user) => fakeApi.addActivity(user.id, { title: 'Gym' }));

    await events.click(screen.getByRole('heading', { name: 'Gym' }));
    const modal = await findModal('Edit Activity');
    await events.click(within(modal).getByRole('button', { name: 'Delete' }));

    expect(await within(modal).findByText('Could not delete.')).toBeInTheDocument();
  });

  it('shows the API error when saving fails', async () => {
    fakeApi.failNext('POST', /\/api\/activities$/, 400, { errors: { DurationMinutes: ['Duration is too long.'] } });
    const { events } = await openActivities();

    await events.click(screen.getByRole('button', { name: 'Add Activity' }));
    const modal = await findModal('New Activity');
    await events.type(field('Title *', modal), 'Marathon');
    await events.click(within(modal).getByRole('button', { name: 'Create' }));

    expect(await within(modal).findByText('Duration is too long.')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it.each(['Cancel', 'Close'])('"%s" closes the form without saving', async (button) => {
    const { events } = await openActivities();

    await events.click(screen.getByRole('button', { name: 'Add Activity' }));
    const modal = await findModal('New Activity');
    await events.type(field('Title *', modal), 'Draft');
    await events.click(within(modal).getByRole('button', { name: button }));

    expect(screen.queryByRole('heading', { name: 'New Activity' })).not.toBeInTheDocument();
    expect(fakeApi.writes()).toHaveLength(0);
  });
});
