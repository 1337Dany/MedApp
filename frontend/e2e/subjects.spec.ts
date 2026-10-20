import { expect, test } from '@playwright/test';
import { field, modal, openView, signUp } from './helpers';

test.describe('Subjects and topics', () => {
  test('every subject and topic button against the API', async ({ page }) => {
    const account = await signUp(page);
    await openView(page, 'Subjects', 'Subjects & Topics');
    await expect(page.getByText(/No subjects yet/)).toBeVisible();

    // Add Subject with every field
    await page.getByRole('button', { name: 'Add Subject' }).click();
    let form = modal(page, 'New Subject');
    await field(form, 'Subject Name *').fill('Pathology');
    await field(form, 'Exam Date').fill('2027-03-15');
    await field(form, 'Study Strategy').selectOption('active-recall');
    await field(form, 'Mode').selectOption('determined');
    await field(form, 'Weight (Priority)').fill('9');
    await form.getByRole('button', { name: 'Color #ef4444' }).click();
    await form.getByRole('button', { name: 'Create' }).click();
    await expect(form).toHaveCount(0);

    const [saved] = await account.api.get('/subjects');
    expect(saved).toMatchObject({
      name: 'Pathology',
      examDate: '2027-03-15',
      planningMethodId: 2,
      priority: 9,
      studyMode: 'determined',
      colorHex: '#ef4444',
    });
    await expect(page.getByRole('heading', { name: 'Pathology' })).toBeVisible();
    await expect(page.getByText('Active Recall')).toBeVisible();

    // Add topic (+) twice
    for (const [title, level] of [
      ['Inflammation', /Needs Work/],
      ['Neoplasia', /Partially Known/],
    ] as const) {
      await page.getByRole('button', { name: 'Add topic to Pathology' }).click();
      form = modal(page, 'New Topic');
      await field(form, 'Topic Title *').fill(title);
      await form.getByLabel(level).check();
      await field(form, 'Notes').fill(`${title} notes`);
      await form.getByRole('button', { name: 'Create' }).click();
      await expect(form).toHaveCount(0);
    }
    await expect(page.getByText('2 topics')).toBeVisible();

    // Expand
    await page.getByRole('heading', { name: 'Pathology' }).click();
    await expect(page.getByText('Inflammation', { exact: true })).toBeVisible();
    await expect(page.getByText('Neoplasia notes')).toBeVisible();

    // Edit topic: a new rating is a review, so the server sets the next review date
    await page.getByRole('button', { name: 'Edit topic Inflammation' }).click();
    form = modal(page, 'Edit Topic');
    await expect(field(form, 'Topic Title *')).toHaveValue('Inflammation');
    await form.getByLabel(/Well Known/).check();
    await form.getByRole('button', { name: 'Update' }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByText(/Next review:/)).toBeVisible();

    // Delete topic: dismiss, then accept
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Delete topic Neoplasia' }).click();
    await expect(page.getByText('Neoplasia', { exact: true })).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete topic Neoplasia' }).click();
    await expect(page.getByText('Neoplasia', { exact: true })).toHaveCount(0);
    await expect(page.getByText('1 topics')).toBeVisible();

    // Collapse
    await page.getByRole('heading', { name: 'Pathology' }).click();
    await expect(page.getByText('Inflammation', { exact: true })).toHaveCount(0);

    // Edit subject
    await page.getByRole('button', { name: 'Edit Pathology' }).click();
    form = modal(page, 'Edit Subject');
    await expect(field(form, 'Subject Name *')).toHaveValue('Pathology');
    await expect(field(form, 'Mode')).toHaveValue('determined');
    await field(form, 'Subject Name *').fill('General Pathology');
    await field(form, 'Mode').selectOption('emergency');
    await form.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('heading', { name: 'General Pathology' })).toBeVisible();
    await expect(page.getByText('emergency', { exact: true })).toBeVisible();

    // Cancel and Close leave the subject unchanged
    for (const button of ['Cancel', 'Close']) {
      await page.getByRole('button', { name: 'Edit General Pathology' }).click();
      form = modal(page, 'Edit Subject');
      await field(form, 'Subject Name *').fill('Discarded');
      await form.getByRole('button', { name: button }).click();
      await expect(form).toHaveCount(0);
    }
    expect((await account.api.get('/subjects'))[0].name).toBe('General Pathology');

    // Delete subject: dismiss, then accept (topics and activities go with it)
    await account.api.activity({ title: 'Pathology lecture', activityTypeId: 2, subjectId: saved.id });
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Delete General Pathology' }).click();
    await expect(page.getByRole('heading', { name: 'General Pathology' })).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete General Pathology' }).click();
    await expect(page.getByText(/No subjects yet/)).toBeVisible();
    expect(await account.api.get('/topics')).toHaveLength(0);
    expect(await account.api.get('/activities')).toHaveLength(0);
  });

  test('the subject form shows a validation error from the API', async ({ page }) => {
    await signUp(page);
    await openView(page, 'Subjects', 'Subjects & Topics');

    await page.getByRole('button', { name: 'Add Subject' }).click();
    const form = modal(page, 'New Subject');
    // Whitespace passes the browser's "required" check but is trimmed to an empty name.
    await field(form, 'Subject Name *').fill('   ');
    await form.getByRole('button', { name: 'Create' }).click();

    await expect(form.locator('p.text-red-700')).toBeVisible();
    await expect(form).toBeVisible();
  });
});
