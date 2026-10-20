import { expect, test } from '@playwright/test';
import { dateInDays, field, modal, signUp } from './helpers';

test.describe('Dashboard', () => {
  test('Plan Sessions plans the chosen horizon with the real planner; Re-plan replaces the plan', async ({ page }) => {
    const account = await signUp(page);
    const subject = await account.api.subject({ name: 'Biochemistry', examDate: dateInDays(14), studyMode: 'determined' });
    await account.api.topic(subject.id, { title: 'Glycolysis' });
    await account.api.topic(subject.id, { title: 'Krebs cycle' });
    await page.reload();

    await page.getByRole('combobox', { name: 'Planning horizon' }).selectOption('14');
    await page.getByRole('button', { name: 'Plan Sessions' }).click();

    const message = page.getByText(/^Planned \d+ study sessions? for the next 14 days\.$/);
    await expect(message).toBeVisible();
    const planned = Number((await message.textContent())!.match(/\d+/)![0]);
    expect(planned).toBeGreaterThan(0);
    const sessions = (await account.api.get('/activities')).filter((a: { isAutoPlanned: boolean }) => a.isAutoPlanned);
    expect(sessions).toHaveLength(planned);

    await page.getByRole('button', { name: 'Re-plan' }).click();
    await expect(page.getByText(/^Planned \d+ study sessions? for the next 14 days\.$/)).toBeVisible();
    const after = (await account.api.get('/activities')).filter((a: { isAutoPlanned: boolean }) => a.isAutoPlanned);
    expect(after.length).toBe(planned);
  });

  test('Plan Sessions explains when there is nothing to plan', async ({ page }) => {
    await signUp(page);
    await page.getByRole('button', { name: 'Plan Sessions' }).click();
    await expect(page.getByText(/Nothing to plan/)).toBeVisible();
  });

  test('Quick Actions: Add Subject, Add Activity, View Calendar and Plan My Week', async ({ page }) => {
    const account = await signUp(page);

    await page.getByRole('button', { name: /Add Subject/ }).click();
    const subjectForm = modal(page, 'New Subject');
    await field(subjectForm, 'Subject Name *').fill('Microbiology');
    await field(subjectForm, 'Exam Date').fill(dateInDays(10));
    await field(subjectForm, 'Study Strategy').selectOption('traffic-light');
    await subjectForm.getByRole('button', { name: 'Create' }).click();
    await expect(subjectForm).toHaveCount(0);
    await expect(page.getByText('Total Subjects').locator('+ p')).toHaveText('1');

    await page.getByRole('button', { name: /Add Activity/ }).click();
    const activityForm = modal(page, 'New Activity');
    await field(activityForm, 'Title *').fill('Lab report');
    await field(activityForm, 'Type *').selectOption('work');
    await activityForm.getByRole('button', { name: 'Create' }).click();
    await expect(activityForm).toHaveCount(0);
    expect((await account.api.get('/activities')).map((a: { title: string }) => a.title)).toContain('Lab report');

    await page.getByRole('button', { name: /Plan My Week/ }).click();
    await expect(page.getByText(/for the next 7 days\.$/)).toBeVisible();

    await page.getByRole('button', { name: /View Calendar/ }).click();
    await expect(page.getByRole('heading', { name: 'Weekly Calendar' })).toBeVisible();
  });

  test('shows workload warnings from the planner', async ({ page }) => {
    const account = await signUp(page);
    // Over 10 h of committed time on a day is a high-severity warning (docs/PLANNING.md).
    const tomorrow = new Date(`${dateInDays(1)}T08:00`);
    await account.api.activity({
      title: 'Clinical rotation',
      activityTypeId: 2,
      startTime: tomorrow.toISOString(),
      durationMinutes: 720,
      isNegotiable: false,
    });
    await page.reload();

    const warning = page.locator('div.bg-red-50.border-red-200');
    await expect(warning).toHaveCount(1);
    await expect(warning.locator('li').first()).toBeVisible();
  });
});
