import { expect, Page, test } from '@playwright/test';
import { field, modal, openView, signUp } from './helpers';

const DAY = 86_400_000;
const atLocal = (daysFromToday: number, hours: number) => {
  const date = new Date(Date.now() + daysFromToday * DAY);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};
const hoursOf = (page: Page, type: string) =>
  page.getByRole('row').filter({ has: page.getByRole('cell', { name: type, exact: true }) }).getByRole('cell').nth(1);

test.describe('Analytics', () => {
  test('reports past weeks from the history and follows schedule changes', async ({ page }) => {
    const account = await signUp(page);
    const subject = await account.api.subject({ name: 'Physiology' });
    const sleep = await account.api.activity({
      title: 'Sleep',
      activityTypeId: 7,
      startTime: atLocal(-30, 23),
      durationMinutes: 480,
      isRecurring: true,
      recurrence: { frequency: 'daily', daysOfWeek: [], until: null },
    });
    await account.api.activity({
      title: 'Lecture',
      activityTypeId: 2,
      subjectId: subject.id,
      startTime: atLocal(-30, 9),
      durationMinutes: 180,
      isRecurring: true,
      recurrence: { frequency: 'weekly', daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], until: null },
    });
    for (const [days, status] of [[-9, 'done'], [-8, 'partiallyDone'], [-6, 'skipped'], [-2, 'done'], [2, 'scheduled']] as const) {
      await account.api.activity({ title: 'Review', subjectId: subject.id, startTime: atLocal(days, 15), durationMinutes: 90, status });
    }
    await page.reload();

    await openView(page, 'Analytics', 'Analytics');
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(hoursOf(page, 'Sleep')).toHaveText('56');
    await expect(hoursOf(page, 'Classes')).toHaveText('15');

    // Shorter nights from now on: last week stays as it was, next week follows the new schedule.
    await openView(page, 'Activities', 'Activities');
    await page.getByRole('heading', { name: 'Sleep' }).click();
    const form = modal(page, 'Edit Activity');
    await field(form, 'Duration (minutes) *').fill('420');
    await form.getByRole('button', { name: 'Update' }).click();
    await expect(form).toHaveCount(0);

    await openView(page, 'Analytics', 'Analytics');
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(hoursOf(page, 'Sleep')).toHaveText('56');
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(hoursOf(page, 'Sleep')).toHaveText('49');

    // Deleting the series keeps its history.
    await account.api.delete(`/activities/${sleep.id}`);
    await page.reload();
    await openView(page, 'Analytics', 'Analytics');
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(hoursOf(page, 'Sleep')).toHaveText('56');
  });
});
