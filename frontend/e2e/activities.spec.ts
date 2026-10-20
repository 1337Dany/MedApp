import { expect, test } from '@playwright/test';
import { dateInDays, field, modal, openView, signUp } from './helpers';

const titles = (page: import('@playwright/test').Page) => page.locator('main h3');

test.describe('Activities', () => {
  test('create, filter, edit and delete through the activity form', async ({ page }) => {
    const account = await signUp(page);
    const subject = await account.api.subject({ name: 'Biochemistry', planningMethodId: 3 });
    const topic = await account.api.topic(subject.id, { title: 'Krebs cycle' });
    await page.reload();
    await openView(page, 'Activities', 'Activities');

    // Add Activity: a weekly study session on a topic
    await page.getByRole('button', { name: 'Add Activity' }).click();
    let form = modal(page, 'New Activity');
    await field(form, 'Title *').fill('Krebs review');
    await field(form, 'Subject').selectOption({ label: 'Biochemistry' });
    await field(form, 'Topic').selectOption({ label: 'Krebs cycle' });
    await field(form, 'Date *').fill(dateInDays(1));
    await field(form, 'Time *').fill('16:30');
    await field(form, 'Duration (minutes) *').fill('90');
    await form.getByLabel('Recurring').check();
    await form.getByRole('button', { name: 'Create' }).click();
    await expect(form.getByText('Pick at least one day for a weekly activity.')).toBeVisible();
    await form.getByRole('button', { name: 'Tuesday' }).click();
    await form.getByRole('button', { name: 'Thursday' }).click();
    await field(form, 'Repeat until (optional)').fill(dateInDays(60));
    await field(form, 'Priority (1-5)').fill('5');
    await field(form, 'Notes').fill('Flashcards');
    await form.getByRole('button', { name: 'Create' }).click();
    await expect(form).toHaveCount(0);

    const [created] = await account.api.get('/activities');
    expect(created).toMatchObject({
      title: 'Krebs review',
      subjectId: subject.id,
      topicId: topic.id,
      durationMinutes: 90,
      priority: 5,
      isRecurring: true,
      recurrence: { frequency: 'weekly', daysOfWeek: ['tuesday', 'thursday'], until: dateInDays(60) },
      notes: 'Flashcards',
    });
    await expect(page.getByText('Recurring', { exact: true })).toBeVisible();

    // A second, non-negotiable activity that is already done
    await page.getByRole('button', { name: 'Add Activity' }).click();
    form = modal(page, 'New Activity');
    await field(form, 'Title *').fill('Night shift');
    await field(form, 'Type *').selectOption('work');
    await field(form, 'Status').selectOption('done');
    await form.getByLabel('Negotiable').uncheck();
    await form.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Non-negotiable')).toBeVisible();

    // Filters
    await page.getByRole('button', { name: 'Completed' }).click();
    await expect(titles(page)).toHaveText(['Night shift']);
    await page.getByRole('button', { name: 'Scheduled' }).click();
    await expect(titles(page)).toHaveText(['Krebs review']);
    await page.getByRole('button', { name: 'Skipped' }).click();
    await expect(page.getByText('No skipped activities.')).toBeVisible();
    await page.getByRole('button', { name: 'All' }).click();
    await expect(titles(page)).toHaveCount(2);

    // Edit: mark as skipped and stop repeating
    await page.getByRole('heading', { name: 'Krebs review' }).click();
    form = modal(page, 'Edit Activity');
    await expect(field(form, 'Time *')).toHaveValue('16:30');
    await expect(form.getByRole('button', { name: 'Tuesday' })).toHaveAttribute('aria-pressed', 'true');
    await field(form, 'Status').selectOption('skipped');
    await form.getByLabel('Recurring').uncheck();
    await form.getByRole('button', { name: 'Update' }).click();
    await expect(form).toHaveCount(0);
    await page.getByRole('button', { name: 'Skipped' }).click();
    await expect(titles(page)).toHaveText(['Krebs review']);
    expect((await account.api.get(`/activities/${created.id}`)).isRecurring).toBe(false);

    // Cancel and Close
    for (const button of ['Cancel', 'Close']) {
      await page.getByRole('heading', { name: 'Krebs review' }).click();
      form = modal(page, 'Edit Activity');
      await field(form, 'Title *').fill('Discarded');
      await form.getByRole('button', { name: button }).click();
      await expect(form).toHaveCount(0);
    }
    await expect(page.getByRole('heading', { name: 'Krebs review' })).toBeVisible();

    // Delete: dismiss keeps the form, accept removes the activity
    await page.getByRole('heading', { name: 'Krebs review' }).click();
    form = modal(page, 'Edit Activity');
    page.once('dialog', (dialog) => dialog.dismiss());
    await form.getByRole('button', { name: 'Delete' }).click();
    await expect(form).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await form.getByRole('button', { name: 'Delete' }).click();
    await expect(form).toHaveCount(0);
    await page.getByRole('button', { name: 'All' }).click();
    await expect(titles(page)).toHaveText(['Night shift']);
  });

  test('the activity form shows a validation error from the API', async ({ page }) => {
    await signUp(page);
    await openView(page, 'Activities', 'Activities');

    await page.getByRole('button', { name: 'Add Activity' }).click();
    const form = modal(page, 'New Activity');
    await field(form, 'Title *').fill('Out of range');
    // Lift the browser's own limit so the request reaches the API validator (priority is 1-5).
    await field(form, 'Priority (1-5)').evaluate((input: HTMLInputElement) => input.removeAttribute('max'));
    await field(form, 'Priority (1-5)').fill('9');
    await form.getByRole('button', { name: 'Create' }).click();

    await expect(form.locator('p.text-red-700')).toBeVisible();
  });
});

test.describe('Calendar', () => {
  test('week navigation, creating from a slot and editing from a block', async ({ page }) => {
    const account = await signUp(page);
    await openView(page, 'Calendar', 'Weekly Calendar');
    const range = page.locator('main h2 + p');
    const thisWeek = await range.textContent();

    await page.getByRole('button', { name: 'Next week' }).click();
    const nextWeek = await range.textContent();
    expect(nextWeek).not.toBe(thisWeek);
    await page.getByRole('button', { name: 'Previous week' }).click();
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(range).not.toHaveText(thisWeek!);
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(range).toHaveText(thisWeek!);

    // Wednesday 14:00 of this week
    await page.getByTestId('slot-3-14').click();
    let form = modal(page, 'New Activity');
    await expect(field(form, 'Time *')).toHaveValue('14:00');
    const date = await field(form, 'Date *').inputValue();
    expect(new Date(`${date}T12:00`).getDay()).toBe(3);
    await field(form, 'Title *').fill('Pharmacology');
    await form.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByTestId('slot-3-14').getByText('Pharmacology')).toBeVisible();
    // The slot's local time in the browser's zone (Europe/Warsaw) is what the API stores, in UTC.
    const expected = await page.evaluate((day) => new Date(`${day}T14:00`).toISOString(), date);
    expect(new Date((await account.api.get('/activities'))[0].startTime).toISOString()).toBe(expected);

    // A recurring series shows on each matching day
    await account.api.activity({
      title: 'Lecture',
      activityTypeId: 2,
      startTime: new Date(`${date}T07:00:00Z`).toISOString(),
      isRecurring: true,
      recurrence: { frequency: 'weekly', daysOfWeek: ['monday', 'wednesday', 'friday'], until: null },
    });
    await page.reload();
    await openView(page, 'Calendar', 'Weekly Calendar');
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page.locator('[data-testid^="slot-"]').getByText('Lecture')).toHaveCount(3);
    await page.getByRole('button', { name: 'Today' }).click();

    // Clicking a block edits it
    await page.getByTestId('slot-3-14').getByText('Pharmacology').click();
    form = modal(page, 'Edit Activity');
    await expect(field(form, 'Title *')).toHaveValue('Pharmacology');
    await field(form, 'Time *').fill('15:00');
    await form.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByTestId('slot-3-15').getByText('Pharmacology')).toBeVisible();
    await expect(page.getByTestId('slot-3-14').getByText('Pharmacology')).toHaveCount(0);
  });
});
