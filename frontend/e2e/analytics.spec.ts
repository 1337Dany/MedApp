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

    // Deleting the series takes its past with it.
    await account.api.delete(`/activities/${sleep.id}`);
    await page.reload();
    await openView(page, 'Analytics', 'Analytics');
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(hoursOf(page, 'Sleep')).toHaveText('0');
  });

  test('picks an exact date and reports that single day', async ({ page }) => {
    const account = await signUp(page);
    // The 15th of last month: far enough to be in the past, and a day number that a month view shows once.
    const picked = await page.evaluate(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() - 1, 15, 10).toISOString();
    });
    await account.api.activity({ title: 'That day', startTime: picked, durationMinutes: 90 });
    await account.api.activity({
      title: 'Day after',
      startTime: new Date(new Date(picked).getTime() + DAY).toISOString(),
      durationMinutes: 30,
    });
    await page.reload();
    await openView(page, 'Analytics', 'Analytics');

    await page.getByRole('button', { name: 'Pick a date' }).click();
    const picker = page.getByRole('dialog');
    await picker.getByRole('button', { name: /previous month/i }).click();
    await picker.getByRole('gridcell', { name: '15', exact: true }).click();
    await expect(picker).toHaveCount(0);

    const label = await page.evaluate(
      (iso) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
      picked,
    );
    await expect(page.getByTestId('analytics-period')).toHaveText(label);
    await expect(page.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(hoursOf(page, 'Studying')).toHaveText('1.5');
    await expect(page.getByRole('heading', { name: 'Study Trend (Last 14 Days, Hours)' })).toBeVisible();

    await page.getByRole('button', { name: 'Next day' }).click();
    await expect(hoursOf(page, 'Studying')).toHaveText('0.5');
    await page.getByRole('button', { name: 'Week', exact: true }).click();
    await expect(page.getByRole('button', { name: 'This week' })).toBeEnabled();
  });

  test('the date picker stays inside a narrow window and works with the keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await signUp(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openView(page, 'Analytics', 'Analytics');
    await page.setViewportSize({ width: 320, height: 640 });

    const trigger = page.getByRole('button', { name: 'Pick a date' });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await page.keyboard.press('Enter');
    const picker = page.getByRole('dialog');
    await expect(picker).toBeVisible();
    const box = (await picker.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    // Styled from the app's static CSS: an opaque panel, day cells of a real size.
    expect(await picker.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
    const day = (await picker.getByRole('gridcell').first().boundingBox())!;
    expect(day.width).toBe(32);

    await page.keyboard.press('Enter');
    await expect(picker).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(trigger).toBeFocused();
  });

  test('a series turned into a one-off in the Calendar keeps the mark and counts every occurrence once', async ({ page }) => {
    const { day, hour } = await page.evaluate(() => ({ day: new Date().getDay(), hour: new Date().getHours() }));
    test.skip(day < 3 || hour < 3, 'needs three earlier days this week and an earlier hour today');
    const past = hour - 2;
    const account = await signUp(page);
    // Seconds in the start: the form drops them.
    const start = await page.evaluate((h) => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      d.setHours(h, 0, 30, 0);
      return d.toISOString();
    }, past);
    const series = await account.api.activity({
      title: 'Series',
      startTime: start,
      durationMinutes: 60,
      isRecurring: true,
      recurrence: { frequency: 'daily', daysOfWeek: [], until: null },
    });
    await account.api.patch(`/activities/${series.id}/status`, { status: 'done', occurrenceStart: start });
    await page.reload();

    await openView(page, 'Calendar', 'Weekly Calendar');
    await page.getByTestId(`slot-${day}-${past}`).getByText('Series').click();
    const form = modal(page, 'Edit Activity');
    await form.getByLabel('Recurring').uncheck();
    await form.getByRole('button', { name: 'Update' }).click();
    await expect(form).toHaveCount(0);

    await expect(page.getByTestId(`slot-${day - 3}-${past}`).locator('div.z-10')).toHaveCount(1);
    await expect(page.getByTestId(`slot-${day - 3}-${past}`)).toContainText('Series');
    await openView(page, 'Analytics', 'Analytics');
    const tile = (label: string) =>
      page.locator('div.bg-white').filter({ has: page.getByText(label, { exact: true }) }).locator('p.text-3xl').first();
    await expect(tile('Study Planned')).toHaveText('4 h');
    await expect(tile('Studied')).toHaveText('1 h');
  });
});
