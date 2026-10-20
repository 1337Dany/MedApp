import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { fakeApi, FakeUser } from '../test/fakeApi';
import { field, findModal, nav, renderApp, setValue } from '../test/render';

async function openSubjects(seed?: (user: FakeUser) => void) {
  const rendered = await renderApp({ seed });
  await screen.findByRole('heading', { name: 'Dashboard' });
  await rendered.events.click(nav('Subjects'));
  return rendered;
}

const withAnatomy = (user: FakeUser) => {
  const anatomy = fakeApi.addSubject(user.id, {
    name: 'Anatomy',
    examDate: '2027-01-20',
    planningMethodId: 1,
    priority: 8,
    studyMode: 'determined',
    colorHex: '#8b5cf6',
  });
  fakeApi.addTopic(anatomy.id, { title: 'Heart', feedback: 'green', notes: 'Four chambers', order: 0 });
  fakeApi.addTopic(anatomy.id, { title: 'Lungs', feedback: 'red', order: 1 });
};

describe('SubjectsView', () => {
  it('lists subjects with their mode, strategy, exam and knowledge counts', async () => {
    await openSubjects(withAnatomy);

    expect(screen.getByRole('heading', { name: 'Anatomy' })).toBeInTheDocument();
    expect(screen.getByText('determined')).toBeInTheDocument();
    expect(screen.getByText('Traffic Light')).toBeInTheDocument();
    expect(screen.getByText(`Exam: ${new Date(2027, 0, 20).toLocaleDateString()}`)).toBeInTheDocument();
    expect(screen.getByText('2 topics')).toBeInTheDocument();
  });

  it('shows the empty state without subjects', async () => {
    await openSubjects();
    expect(screen.getByText(/No subjects yet/)).toBeInTheDocument();
  });

  it('clicking a subject expands and collapses its topics in order', async () => {
    const { events } = await openSubjects(withAnatomy);

    await events.click(screen.getByRole('heading', { name: 'Anatomy' }));
    const titles = screen.getAllByText(/^(Heart|Lungs)$/).map((e) => e.textContent);
    expect(titles).toEqual(['Heart', 'Lungs']);
    expect(screen.getByText('Four chambers')).toBeInTheDocument();

    await events.click(screen.getByRole('heading', { name: 'Anatomy' }));
    expect(screen.queryByText('Heart')).not.toBeInTheDocument();
  });

  it('an expanded subject without topics says so', async () => {
    const { events } = await openSubjects((user) => fakeApi.addSubject(user.id, { name: 'Histology' }));

    await events.click(screen.getByRole('heading', { name: 'Histology' }));
    expect(screen.getByText(/No topics yet/)).toBeInTheDocument();
  });

  describe('subject buttons', () => {
    it('"Add Subject" creates a subject from every form field', async () => {
      const { events } = await openSubjects();

      await events.click(screen.getByRole('button', { name: 'Add Subject' }));
      const modal = await findModal('New Subject');
      await events.type(field('Subject Name *', modal), '  Pathology ');
      setValue(field('Exam Date', modal), '2027-03-15');
      await events.selectOptions(field('Study Strategy', modal), 'active-recall');
      expect(within(modal).getByText('Automated spaced repetition reminders')).toBeInTheDocument();
      await events.selectOptions(field('Mode', modal), 'emergency');
      expect(within(modal).getByText('Very little time left, maximum priority')).toBeInTheDocument();
      setValue(field('Weight (Priority)', modal), '9');
      await events.click(within(modal).getByRole('button', { name: 'Color #10b981' }));
      expect(within(modal).getByRole('button', { name: 'Color #10b981' })).toHaveAttribute('aria-pressed', 'true');
      await events.click(within(modal).getByRole('button', { name: 'Create' }));

      expect(fakeApi.writes(/^\/subjects$/)[0].body).toEqual({
        name: 'Pathology',
        examDate: '2027-03-15',
        planningMethodId: 2,
        priority: 9,
        studyMode: 'emergency',
        colorHex: '#10b981',
      });
      expect(screen.queryByRole('heading', { name: 'New Subject' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Pathology' })).toBeInTheDocument();
    });

    it('a new subject defaults to manual, relaxed, weight 5, the first color and no exam', async () => {
      const { events } = await openSubjects();

      await events.click(screen.getByRole('button', { name: 'Add Subject' }));
      const modal = await findModal('New Subject');
      await events.type(field('Subject Name *', modal), 'Genetics');
      await events.click(within(modal).getByRole('button', { name: 'Create' }));

      expect(fakeApi.writes(/^\/subjects$/)[0].body).toEqual({
        name: 'Genetics',
        examDate: null,
        planningMethodId: 3,
        priority: 5,
        studyMode: 'relaxed',
        colorHex: '#3b82f6',
      });
    });

    it('the edit button opens the subject prefilled and "Update" saves it', async () => {
      const { events } = await openSubjects(withAnatomy);

      await events.click(screen.getByRole('button', { name: 'Edit Anatomy' }));
      const modal = await findModal('Edit Subject');
      expect(field('Subject Name *', modal)).toHaveValue('Anatomy');
      expect(field('Exam Date', modal)).toHaveValue('2027-01-20');
      expect(field('Study Strategy', modal)).toHaveValue('traffic-light');
      expect(field('Mode', modal)).toHaveValue('determined');
      expect(field('Weight (Priority)', modal)).toHaveValue('8');
      expect(within(modal).getByRole('button', { name: 'Color #8b5cf6' })).toHaveAttribute('aria-pressed', 'true');

      await events.clear(field('Subject Name *', modal));
      await events.type(field('Subject Name *', modal), 'Human Anatomy');
      setValue(field('Exam Date', modal), '');
      await events.click(within(modal).getByRole('button', { name: 'Update' }));

      const [request] = fakeApi.writes(/^\/subjects\//);
      expect(request.method).toBe('PUT');
      expect(request.body).toMatchObject({ name: 'Human Anatomy', examDate: null, planningMethodId: 1, priority: 8 });
      expect(screen.getByRole('heading', { name: 'Human Anatomy' })).toBeInTheDocument();
      // Editing does not toggle the row.
      expect(screen.queryByText('Heart')).not.toBeInTheDocument();
    });

    it('shows the API error inside the subject form', async () => {
      fakeApi.failNext('POST', /\/api\/subjects$/, 400, { errors: { Name: ['Name is too long.'] } });
      const { events } = await openSubjects();

      await events.click(screen.getByRole('button', { name: 'Add Subject' }));
      const modal = await findModal('New Subject');
      await events.type(field('Subject Name *', modal), 'Anything');
      await events.click(within(modal).getByRole('button', { name: 'Create' }));

      expect(await within(modal).findByText('Name is too long.')).toBeInTheDocument();
      expect(within(modal).getByRole('button', { name: 'Create' })).toBeEnabled();
    });

    it.each(['Cancel', 'Close'])('"%s" closes the subject form without saving', async (button) => {
      const { events } = await openSubjects();

      await events.click(screen.getByRole('button', { name: 'Add Subject' }));
      const modal = await findModal('New Subject');
      await events.type(field('Subject Name *', modal), 'Draft');
      await events.click(within(modal).getByRole('button', { name: button }));

      expect(screen.queryByRole('heading', { name: 'New Subject' })).not.toBeInTheDocument();
      expect(fakeApi.writes()).toHaveLength(0);
    });

    it('the delete button removes the subject with its topics and activities after confirmation', async () => {
      const { events } = await openSubjects((user) => {
        withAnatomy(user);
        fakeApi.addActivity(user.id, { title: 'Lecture', subjectId: fakeApi.subjects[0].id });
      });

      const id = fakeApi.subjects[0].id;

      await events.click(screen.getByRole('button', { name: 'Delete Anatomy' }));

      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('All its topics and activities'));
      expect(fakeApi.writes()[0]).toMatchObject({ method: 'DELETE', path: `/subjects/${id}` });
      expect(await screen.findByText(/No subjects yet/)).toBeInTheDocument();
      expect(fakeApi.activities).toHaveLength(0);
    });

    it('cancelling the confirmation keeps the subject', async () => {
      const { events } = await openSubjects(withAnatomy);
      vi.mocked(window.confirm).mockReturnValueOnce(false);

      await events.click(screen.getByRole('button', { name: 'Delete Anatomy' }));

      expect(fakeApi.writes()).toHaveLength(0);
      expect(screen.getByRole('heading', { name: 'Anatomy' })).toBeInTheDocument();
    });

    it('alerts when the subject cannot be deleted', async () => {
      fakeApi.failNext('DELETE', /subjects\//, 500, { title: 'Delete failed.' });
      const { events } = await openSubjects(withAnatomy);

      await events.click(screen.getByRole('button', { name: 'Delete Anatomy' }));

      await vi.waitFor(() => expect(window.alert).toHaveBeenCalledWith('Delete failed.'));
      expect(screen.getByRole('heading', { name: 'Anatomy' })).toBeInTheDocument();
    });
  });

  describe('topic buttons', () => {
    it('the add-topic button creates a topic in that subject with knowledge and notes', async () => {
      const { events } = await openSubjects(withAnatomy);

      await events.click(screen.getByRole('button', { name: 'Add topic to Anatomy' }));
      const modal = await findModal('New Topic');
      expect(within(modal).getByLabelText(/Needs Work/)).toBeChecked();
      await events.type(field('Topic Title *', modal), 'Kidneys');
      await events.click(within(modal).getByLabelText(/Partially Known/));
      await events.type(field('Notes', modal), 'Nephron');
      await events.click(within(modal).getByRole('button', { name: 'Create' }));

      const [request] = fakeApi.writes();
      expect(request.path).toBe(`/subjects/${fakeApi.subjects[0].id}/topics`);
      expect(request.body).toEqual({ title: 'Kidneys', notes: 'Nephron', feedback: 'yellow', order: null });
      expect(screen.getByText('3 topics')).toBeInTheDocument();

      await events.click(screen.getByRole('heading', { name: 'Anatomy' }));
      expect(screen.getByText('Kidneys')).toBeInTheDocument();
    });

    it('the edit-topic button saves a new rating and shows the review dates from the server', async () => {
      const { events } = await openSubjects(withAnatomy);
      await events.click(screen.getByRole('heading', { name: 'Anatomy' }));

      await events.click(screen.getByRole('button', { name: 'Edit topic Lungs' }));
      const modal = await findModal('Edit Topic');
      expect(field('Topic Title *', modal)).toHaveValue('Lungs');
      await events.click(within(modal).getByLabelText(/Well Known/));
      await events.click(within(modal).getByRole('button', { name: 'Update' }));

      const [request] = fakeApi.writes();
      expect(request).toMatchObject({ method: 'PUT', body: { title: 'Lungs', feedback: 'green', order: 1 } });
      expect(await screen.findByText(/Next review:/)).toBeInTheDocument();
    });

    it('shows the API error inside the topic form', async () => {
      fakeApi.failNext('PUT', /topics\//, 400, { errors: { Title: ['Title is required.'] } });
      const { events } = await openSubjects(withAnatomy);
      await events.click(screen.getByRole('heading', { name: 'Anatomy' }));

      await events.click(screen.getByRole('button', { name: 'Edit topic Heart' }));
      const modal = await findModal('Edit Topic');
      await events.click(within(modal).getByRole('button', { name: 'Update' }));

      expect(await within(modal).findByText('Title is required.')).toBeInTheDocument();
    });

    it.each(['Cancel', 'Close'])('"%s" closes the topic form without saving', async (button) => {
      const { events } = await openSubjects(withAnatomy);

      await events.click(screen.getByRole('button', { name: 'Add topic to Anatomy' }));
      const modal = await findModal('New Topic');
      await events.click(within(modal).getByRole('button', { name: button }));

      expect(screen.queryByRole('heading', { name: 'New Topic' })).not.toBeInTheDocument();
      expect(fakeApi.writes()).toHaveLength(0);
    });

    it('the delete-topic button removes the topic after confirmation', async () => {
      const { events } = await openSubjects(withAnatomy);
      await events.click(screen.getByRole('heading', { name: 'Anatomy' }));

      await events.click(screen.getByRole('button', { name: 'Delete topic Heart' }));

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this topic?');
      expect(await screen.findByText('1 topics')).toBeInTheDocument();
      expect(screen.queryByText('Heart')).not.toBeInTheDocument();
      expect(fakeApi.writes()[0].method).toBe('DELETE');
    });

    it('cancelling the confirmation keeps the topic', async () => {
      const { events } = await openSubjects(withAnatomy);
      await events.click(screen.getByRole('heading', { name: 'Anatomy' }));
      vi.mocked(window.confirm).mockReturnValueOnce(false);

      await events.click(screen.getByRole('button', { name: 'Delete topic Heart' }));

      expect(screen.getByText('Heart')).toBeInTheDocument();
      expect(fakeApi.writes()).toHaveLength(0);
    });
  });
});
