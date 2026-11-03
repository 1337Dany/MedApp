import { expect, Page, test } from '@playwright/test';
import { Account, field, modal, openView, signUp } from './helpers';

// Reproduction suite for "changes in the calendar do not show in Analytics". Every change goes through the
// Calendar like a user would; the numbers are read from the Analytics view (docs/ANALYTICS.md).
// A failing test here documents a confirmed bug. Set SHOTS_DIR to keep screenshots of the calendar.

const SERIES_DAILY = { isRecurring: true, recurrence: { frequency: 'daily', daysOfWeek: [], until: null } };
const STUDY = 1;

/** Browser-local clock, because the test process may run in another zone than the browser. */
async function clock(page: Page) {
  return page.evaluate(() => ({ day: new Date().getDay(), hour: new Date().getHours() }));
}

/** ISO instant of a local time in the browser's zone, offset by whole days from today. */
const localIso = (page: Page, days: number, hour: number, minute = 0) =>
  page.evaluate(
    ([d, h, m]) => {
      const date = new Date();
      date.setDate(date.getDate() + d);
      date.setHours(h, m, 0, 0);
      return date.toISOString();
    },
    [days, hour, minute],
  );

/**
 * The hours around now and the weekday, for tests that need earlier and later slots today and three earlier
 * days in the same week. Skipped when the run falls outside of that (first part of a week, around midnight).
 */
async function midWeek(page: Page) {
  const { day, hour } = await clock(page);
  test.skip(day < 3 || hour < 3 || hour > 20, 'needs three earlier days this week and free hours around now');
  return { day, past: hour - 2, future: hour + 2, laterDaysThisWeek: 6 - day };
}

const shot = async (page: Page, name: string) => {
  if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.png` });
};

const slot = (page: Page, day: number, hour: number) => page.getByTestId(`slot-${day}-${hour}`);
const blocks = (page: Page) => page.locator('[data-testid^="slot-"] > div.z-10');

async function calendar(page: Page) {
  await openView(page, 'Calendar', 'Weekly Calendar');
}

/** Creates an activity from an empty slot of the shown week. */
async function createFromSlot(
  page: Page,
  day: number,
  hour: number,
  { title, duration = 60, date, daily = false }: { title: string; duration?: number; date?: string; daily?: boolean },
) {
  await slot(page, day, hour).click({ position: { x: 3, y: 3 } });
  const form = modal(page, 'New Activity');
  await field(form, 'Title *').fill(title);
  await field(form, 'Duration (minutes) *').fill(String(duration));
  if (date) await field(form, 'Date *').fill(date);
  if (daily) {
    await form.getByLabel('Recurring').check();
    await field(form, 'Frequency').selectOption('daily');
  }
  await form.getByRole('button', { name: 'Create' }).click();
  await expect(form).toHaveCount(0);
}

async function openBlock(page: Page, day: number, hour: number, title: string) {
  await slot(page, day, hour).getByText(title).first().click();
  return modal(page, 'Edit Activity');
}

async function save(page: Page) {
  const form = modal(page, 'Edit Activity');
  await form.getByRole('button', { name: 'Update' }).click();
  await expect(form).toHaveCount(0);
}

async function mark(page: Page, day: number, hour: number, title: string, status: string) {
  const form = await openBlock(page, day, hour, title);
  const button = form.getByRole('group', { name: 'Status of this occurrence' }).getByRole('button', { name: status, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await form.getByRole('button', { name: 'Close' }).click();
  await expect(form).toHaveCount(0);
}

async function analytics(page: Page) {
  await openView(page, 'Analytics', 'Analytics');
  await expect(tile(page, 'Study Planned')).toBeVisible();
}

const tile = (page: Page, label: string) =>
  page.locator('div.bg-white').filter({ has: page.getByText(label, { exact: true }) }).locator('p.text-3xl').first();

const tileDetail = (page: Page, label: string) =>
  page.locator('div.bg-white').filter({ has: page.getByText(label, { exact: true }) }).locator('p.text-xs').first();

const typeHours = (page: Page, type: string) =>
  page.getByRole('row').filter({ has: page.getByRole('cell', { name: type, exact: true }) }).getByRole('cell').nth(1);

const marked = (page: Page, status: string) =>
  page
    .locator('div.bg-white')
    .filter({ has: page.getByRole('heading', { name: 'How Past Activities Were Marked' }) })
    .locator('li')
    .filter({ has: page.getByText(status, { exact: true }) })
    .locator('span.font-medium');

/** Fails softly, so one scenario reports every number that is off. */
async function expectReport(
  page: Page,
  { planned, studied, completion, sessions }: { planned?: string; studied?: string; completion?: string; sessions?: number },
) {
  if (planned !== undefined) await expect.soft(tile(page, 'Study Planned'), 'Study Planned').toHaveText(`${planned} h`);
  if (studied !== undefined) await expect.soft(tile(page, 'Studied'), 'Studied').toHaveText(`${studied} h`);
  if (completion !== undefined) await expect.soft(tile(page, 'Completion Rate'), 'Completion').toHaveText(completion);
  if (sessions !== undefined) {
    await expect.soft(tileDetail(page, 'Completion Rate'), 'started sessions').toContainText(`Of ${sessions} study session`);
  }
}

async function seedDaily(page: Page, account: Account, title: string, daysAgo: number, hour: number, overrides: object = {}) {
  await account.api.activity({
    title,
    activityTypeId: STUDY,
    startTime: await localIso(page, -daysAgo, hour),
    durationMinutes: 60,
    ...SERIES_DAILY,
    ...overrides,
  });
  await page.reload();
}

test.describe('Calendar changes reach Analytics', () => {
  test('a) one-offs created in the Calendar on a past and a future slot', async ({ page }) => {
    const { day, past, future } = await midWeek(page);
    await signUp(page);
    await calendar(page);
    await createFromSlot(page, day, past, { title: 'Past session', duration: 120 });
    await createFromSlot(page, day, future, { title: 'Future session', duration: 90 });
    await analytics(page);
    await expectReport(page, { planned: '3.5', studied: '0', completion: '0%', sessions: 1 });
    await expect.soft(typeHours(page, 'Studying')).toHaveText('3.5');
    await expect.soft(marked(page, 'Not marked')).toContainText('1');
  });

  test('b) a one-off edited in the Calendar modal, past and future', async ({ page }) => {
    const { day, past, future } = await midWeek(page);
    await signUp(page);
    await calendar(page);
    await createFromSlot(page, day, past, { title: 'P', duration: 60 });
    await createFromSlot(page, day, future, { title: 'F', duration: 60 });

    // Status of the past one
    let form = await openBlock(page, day, past, 'P');
    await field(form, 'Status').selectOption('done');
    await save(page);
    await analytics(page);
    await expectReport(page, { planned: '2', studied: '1', completion: '100%', sessions: 1 });
    await expect.soft(marked(page, 'Done')).toContainText('1');

    // Duration of both
    await calendar(page);
    form = await openBlock(page, day, past, 'P');
    await field(form, 'Duration (minutes) *').fill('120');
    await save(page);
    form = await openBlock(page, day, future, 'F');
    await field(form, 'Duration (minutes) *').fill('180');
    await save(page);
    await analytics(page);
    await expectReport(page, { planned: '5', studied: '2', completion: '100%', sessions: 1 });

    // Time: the past one to another past hour, the future one into the past (it counts as started then)
    await calendar(page);
    form = await openBlock(page, day, future, 'F');
    await field(form, 'Time *').fill(`${String(past - 1).padStart(2, '0')}:00`);
    await save(page);
    await expect.soft(slot(page, day, past - 1).getByText('F')).toBeVisible();
    await analytics(page);
    await expectReport(page, { planned: '5', studied: '2', completion: '50%', sessions: 2 });

    // Status back to scheduled
    await calendar(page);
    form = await openBlock(page, day, past, 'P');
    await field(form, 'Status').selectOption('scheduled');
    await save(page);
    await analytics(page);
    await expectReport(page, { planned: '5', studied: '0', completion: '0%', sessions: 2 });

    // Type: the session stops being study time
    await calendar(page);
    form = await openBlock(page, day, past, 'P');
    await field(form, 'Type *').selectOption('class');
    await save(page);
    await analytics(page);
    await expectReport(page, { planned: '3', sessions: 1 });
    await expect.soft(typeHours(page, 'Classes')).toHaveText('2');
  });

  test('b) changing the subject of a past one-off in the modal', async ({ page }) => {
    const { day, past } = await midWeek(page);
    const account = await signUp(page);
    await account.api.subject({ name: 'Physiology' });
    await page.reload();
    await calendar(page);
    await createFromSlot(page, day, past, { title: 'P', duration: 60 });
    const form = await openBlock(page, day, past, 'P');
    await field(form, 'Subject').selectOption({ label: 'Physiology' });
    await save(page);
    await analytics(page);
    await expect.soft(page.getByText('Physiology').first()).toBeVisible();
  });

  test('c, k) marking series occurrences, past and future', async ({ page }) => {
    const { day, past, laterDaysThisWeek } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, past);
    const planned = 4 + laterDaysThisWeek;

    await analytics(page);
    await expectReport(page, { planned: String(planned), studied: '0', completion: '0%', sessions: 4 });

    await calendar(page);
    await mark(page, day - 1, past, 'Series', 'Done');
    await expect.soft(slot(page, day - 1, past).getByText('Done')).toBeVisible();
    await analytics(page);
    await expectReport(page, { planned: String(planned), studied: '1', completion: '25%', sessions: 4 });
    await expect.soft(marked(page, 'Done')).toContainText('1');
    await shot(page, 'c-analytics-after-done');

    await calendar(page);
    await mark(page, day - 1, past, 'Series', 'Partially done');
    await analytics(page);
    await expectReport(page, { studied: '0.5', planned: String(planned), completion: '13%' });
    await expect.soft(marked(page, 'Partially done')).toContainText('1');

    await calendar(page);
    await mark(page, day - 1, past, 'Series', 'Skipped');
    await analytics(page);
    await expectReport(page, { studied: '0', planned: String(planned), completion: '0%' });
    await expect.soft(marked(page, 'Skipped')).toContainText('1');

    await calendar(page);
    await mark(page, day - 1, past, 'Series', 'Not marked');
    await analytics(page);
    await expectReport(page, { studied: '0', planned: String(planned), completion: '0%' });
    await expect.soft(marked(page, 'Not marked')).toContainText('4');
    await expect.soft(marked(page, 'Skipped')).toContainText('0');

    // A future occurrence: credited in Studied and shown on the block, not in the "started" numbers.
    test.skip(laterDaysThisWeek === 0, 'no later day this week');
    await calendar(page);
    await mark(page, day + 1, past, 'Series', 'Done');
    await expect.soft(slot(page, day + 1, past).getByText('Done')).toBeVisible();
    await analytics(page);
    await expectReport(page, { studied: '1', planned: String(planned), completion: '0%', sessions: 4 });

    // ...stays through an edit that does not move the series, and is dropped by one that does (documented).
    await calendar(page);
    let form = await openBlock(page, day + 1, past, 'Series');
    await field(form, 'Title *').fill('Series 2');
    await save(page);
    await expect.soft(slot(page, day + 1, past).getByText('Done')).toBeVisible();
    await analytics(page);
    await expectReport(page, { studied: '1', planned: String(planned) });

    await calendar(page);
    form = await openBlock(page, day + 1, past, 'Series 2');
    await field(form, 'Time *').fill(`${String(past + 4).padStart(2, '0')}:30`);
    await save(page);
    await analytics(page);
    await expectReport(page, { studied: '0' });

    // Back to not marked on a future occurrence
    await calendar(page);
    await mark(page, day + 1, past + 4, 'Series 2', 'Done');
    await mark(page, day + 1, past + 4, 'Series 2', 'Not marked');
    await analytics(page);
    await expectReport(page, { studied: '0' });
  });

  test('c) the trend chart follows a mark', async ({ page }) => {
    const { day, past } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, past);
    await calendar(page);
    await mark(page, day - 1, past, 'Series', 'Done');
    await analytics(page);
    const chart = page
      .locator('div.bg-white')
      .filter({ has: page.getByRole('heading', { name: /Study Trend/ }) })
      .locator('.recharts-wrapper');
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    // The current week is the rightmost point of the line.
    await page.mouse.move(box.x + box.width - 6, box.y + box.height / 2);
    await expect.soft(chart.locator('.recharts-tooltip-wrapper')).toContainText(/Studied\s*:\s*1/i);
    await shot(page, 'c-trend-tooltip');
  });

  test('d) editing the duration of a series changes today on, not the past', async ({ page }) => {
    const { day, future, laterDaysThisWeek } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, future);
    await calendar(page);
    const form = await openBlock(page, day, future, 'Series');
    await field(form, 'Duration (minutes) *').fill('120');
    await save(page);
    await analytics(page);
    // Three past hours, then today and the later days at two hours each
    await expectReport(page, { planned: String(3 + 2 * (1 + laterDaysThisWeek)) });
  });

  test('d) editing the days of a series', async ({ page }) => {
    const { day, future, laterDaysThisWeek } = await midWeek(page);
    test.skip(laterDaysThisWeek === 0, 'no later day this week');
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, future);
    await calendar(page);
    const form = await openBlock(page, day, future, 'Series');
    await field(form, 'Frequency').selectOption('weekly');
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    await form.getByRole('button', { name: names[day + 1], exact: true }).click();
    await save(page);
    // Three past hours and the one chosen day
    await expect.soft(slot(page, day, future).getByText('Series')).toHaveCount(0);
    await analytics(page);
    await expectReport(page, { planned: '4' });
  });

  test('d) moving a series to an earlier time of day that has passed keeps today', async ({ page }) => {
    const { day, past, future, laterDaysThisWeek } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, future);
    await calendar(page);
    await expect(slot(page, day, future).getByText('Series')).toBeVisible();
    const form = await openBlock(page, day, future, 'Series');
    await field(form, 'Time *').fill(`${String(past).padStart(2, '0')}:00`);
    await save(page);
    await shot(page, 'd-moved-earlier-calendar');
    // Today's session was still ahead and is now at the new, earlier time: it happened (or was missed) today.
    await expect.soft(slot(page, day, past).getByText('Series'), "today's occurrence at the new time").toBeVisible();
    await analytics(page);
    await expectReport(page, { planned: String(3 + 1 + laterDaysThisWeek), sessions: 4 });
  });

  test('d) moving a series to a later time today keeps calendar and analytics equal', async ({ page }) => {
    const { day, past, future, laterDaysThisWeek } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, past);
    await calendar(page);
    const form = await openBlock(page, day, past, 'Series');
    await field(form, 'Time *').fill(`${String(future).padStart(2, '0')}:00`);
    await save(page);
    // Today's passed occurrence stays in the history and the new time is still to come (documented: the past stays).
    await expect.soft(slot(page, day, past).getByText('Series')).toBeVisible();
    await expect.soft(slot(page, day, future).getByText('Series')).toBeVisible();
    await analytics(page);
    await expectReport(page, { planned: String(4 + 1 + laterDaysThisWeek), sessions: 4 });
  });

  test('e) a series created in the Calendar with a start in the past', async ({ page }) => {
    const { day, past, laterDaysThisWeek } = await midWeek(page);
    await signUp(page);
    await calendar(page);
    const date = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await createFromSlot(page, day, past, { title: 'Series', date, daily: true });
    await expect.soft(blocks(page).filter({ hasText: 'Series' })).toHaveCount(4 + laterDaysThisWeek);
    await analytics(page);
    await expectReport(page, { planned: String(4 + laterDaysThisWeek), sessions: 4 });
  });

  test('e) moving the start of a running series earlier (documented limit: days already passed stay empty)', async ({ page }) => {
    const { day, past, laterDaysThisWeek } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 2, past);
    await calendar(page);
    const form = await openBlock(page, day, past, 'Series');
    const moved = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await field(form, 'Date *').fill(moved);
    await save(page);
    await analytics(page);
    await expectReport(page, { planned: String(3 + laterDaysThisWeek), sessions: 3 });
  });

  test('e) moving the start of a series that has not started into the past fills in the days', async ({ page }) => {
    const { day, past, laterDaysThisWeek } = await midWeek(page);
    test.skip(laterDaysThisWeek === 0, 'no later day this week');
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', -1, past);
    await calendar(page);
    const form = await openBlock(page, day + 1, past, 'Series');
    const moved = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await field(form, 'Date *').fill(moved);
    await save(page);
    await analytics(page);
    await expectReport(page, { planned: String(4 + laterDaysThisWeek), sessions: 4 });
  });

  test('f) deleting one-offs and a series from the Calendar', async ({ page }) => {
    const { day, past, future, laterDaysThisWeek } = await midWeek(page);
    const account = await signUp(page);
    page.on('dialog', (dialog) => dialog.accept());
    await calendar(page);
    await createFromSlot(page, day, past, { title: 'P', duration: 60 });
    await createFromSlot(page, day, future, { title: 'F', duration: 60 });
    await analytics(page);
    await expectReport(page, { planned: '2', sessions: 1 });

    await calendar(page);
    await (await openBlock(page, day, past, 'P')).getByRole('button', { name: 'Delete' }).click();
    await expect(slot(page, day, past).getByText('P')).toHaveCount(0);
    await analytics(page);
    await expectReport(page, { planned: '1', sessions: 0 });

    await calendar(page);
    await (await openBlock(page, day, future, 'F')).getByRole('button', { name: 'Delete' }).click();
    await analytics(page);
    await expectReport(page, { planned: '0', sessions: 0 });

    // A series goes completely, its past included.
    await account.api.activity({
      title: 'Series',
      activityTypeId: STUDY,
      startTime: await localIso(page, -3, past),
      durationMinutes: 60,
      ...SERIES_DAILY,
    });
    await page.reload();
    await analytics(page);
    await expectReport(page, { planned: String(4 + laterDaysThisWeek), sessions: 4 });
    await calendar(page);
    await (await openBlock(page, day, past, 'Series')).getByRole('button', { name: 'Delete series' }).click();
    await expect(modal(page, 'Edit Activity')).toHaveCount(0);
    await analytics(page);
    await expectReport(page, { planned: '0', sessions: 0 });
    await calendar(page);
    await expect(blocks(page).filter({ hasText: 'Series' })).toHaveCount(0);
  });

  test('g) one-off to series', async ({ page }) => {
    const { day, past, laterDaysThisWeek } = await midWeek(page);
    const account = await signUp(page);
    await account.api.activity({ title: 'One', activityTypeId: STUDY, startTime: await localIso(page, -3, past), status: 'done' });
    await page.reload();
    await calendar(page);
    const form = await openBlock(page, day - 3, past, 'One');
    await form.getByLabel('Recurring').check();
    await field(form, 'Frequency').selectOption('daily');
    await save(page);
    await analytics(page);
    await expectReport(page, { planned: String(4 + laterDaysThisWeek), sessions: 4 });
  });

  test('g) series to one-off does not count its first occurrence twice', async ({ page }) => {
    const { day, past } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, past);
    await calendar(page);
    const form = await openBlock(page, day, past, 'Series');
    await form.getByLabel('Recurring').uncheck();
    await save(page);
    await shot(page, 'g-series-to-oneoff-calendar');
    // Four past occurrences stay; the one-off keeps the start of the series, which is one of those four.
    await expect.soft(blocks(page).filter({ hasText: 'Series' }), 'blocks in the calendar').toHaveCount(4);
    await analytics(page);
    await expectReport(page, { planned: '4', sessions: 4 });
  });

  test('h) an occurrence over midnight and the calendar blocks against the analytics hours', async ({ page }) => {
    const { day, past } = await midWeek(page);
    const account = await signUp(page);
    await account.api.activity({ title: 'Night', activityTypeId: 7, startTime: await localIso(page, -1, 23), durationMinutes: 480 });
    await account.api.activity({ title: 'Work', activityTypeId: 5, startTime: await localIso(page, -2, 9), durationMinutes: 150 });
    await account.api.activity({ title: 'Lecture', activityTypeId: 2, startTime: await localIso(page, 0, past), durationMinutes: 90 });
    await page.reload();
    await calendar(page);
    await expect.soft(slot(page, day - 1, 23).getByText('Night')).toBeVisible();
    await expect.soft(slot(page, day, 0).getByText('Night')).toBeVisible();
    await shot(page, 'h-overnight');
    const px = await blocks(page).evaluateAll((all) => all.map((b) => parseFloat((b as HTMLElement).style.height)));
    expect.soft(px.reduce((sum, h) => sum + h, 0) / 60, 'hours drawn').toBe(8 + 2.5 + 1.5);
    await analytics(page);
    await expect.soft(typeHours(page, 'Sleep')).toHaveText('8');
    await expect.soft(typeHours(page, 'Work')).toHaveText('2.5');
    await expect.soft(typeHours(page, 'Classes')).toHaveText('1.5');
  });

  test('h) an occurrence over the end of the week', async ({ page }) => {
    const { day } = await clock(page);
    const account = await signUp(page);
    await account.api.activity({ title: 'Late', activityTypeId: STUDY, startTime: await localIso(page, 6 - day, 23), durationMinutes: 120 });
    await page.reload();
    await calendar(page);
    await expect.soft(slot(page, 6, 23).getByText('Late')).toBeVisible();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect.soft(slot(page, 0, 0).getByText('Late')).toBeVisible();
    await analytics(page);
    // Tile by start, table by the part inside the week: this is what the view reports today.
    await expect.soft(tile(page, 'Study Planned')).toHaveText('2 h');
    await expect.soft(typeHours(page, 'Studying'), 'hours table counts the part in this week').toHaveText('1');
  });

  test('i) a failed refresh after marking an occurrence must not leave the views stale', async ({ page }) => {
    const { day, past } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, past);
    await calendar(page);
    await page.route('**/api/planning/warnings*', (route) => route.abort());
    await mark(page, day - 1, past, 'Series', 'Done');
    await shot(page, 'i-stale-after-failed-refresh');
    // The write succeeded...
    const occurrences = await account.api.get(
      `/occurrences?from=${encodeURIComponent(await localIso(page, -1, 0))}&to=${encodeURIComponent(await localIso(page, 0, 0))}`,
    );
    expect(occurrences[0].status).toBe('done');
    // ...so the block has to say so.
    await expect.soft(slot(page, day - 1, past).getByText('Done'), 'mark on the block').toBeVisible();
  });

  test('i) a failed refresh after editing does not leave the views stale', async ({ page }) => {
    const { day, past } = await midWeek(page);
    await signUp(page);
    await calendar(page);
    await createFromSlot(page, day, past, { title: 'P' });
    await page.route('**/api/planning/warnings*', (route) => route.abort());
    const form = await openBlock(page, day, past, 'P');
    await field(form, 'Status').selectOption('done');
    await save(page);
    await expect.soft(slot(page, day, past).getByText('Done')).toBeVisible();
    await analytics(page);
    await expectReport(page, { planned: '1', studied: '1', completion: '100%' });
  });

  test('j) reads of the occurrences while writes are in flight', async ({ page }) => {
    const { past } = await midWeek(page);
    const account = await signUp(page);
    const headers = { Authorization: `Bearer ${account.accessToken}` };
    const from = encodeURIComponent(await localIso(page, -20, 0));
    const to = encodeURIComponent(await localIso(page, 20, 0));
    const read = () =>
      page.request.get(`/api/occurrences?from=${from}&to=${to}&timeZone=Europe%2FWarsaw`, { headers }).then((r) => r.status());
    const start = await localIso(page, -2, past);
    const failed: string[] = [];
    const statuses: number[] = [];
    const note = (name: string, status: number) => {
      if (status >= 500) failed.push(name);
      return status;
    };

    for (let round = 0; round < 15; round++) {
      const created = await account.api.activity({ title: `R${round}`, activityTypeId: STUDY, startTime: start });
      const series = await account.api.activity({ title: `S${round}`, activityTypeId: STUDY, startTime: start, ...SERIES_DAILY });
      const body = {
        title: `E${round}`,
        activityTypeId: STUDY,
        priority: 3,
        startTime: start,
        durationMinutes: 45,
        isRecurring: false,
        isNegotiable: true,
        status: 'done',
        recurrence: null,
        subjectId: null,
        topicId: null,
        notes: null,
      };
      const results = await Promise.all([
        read().then((s) => note('GET occurrences', s)),
        read().then((s) => note('GET occurrences', s)),
        page.request.delete(`/api/activities/${series.id}`, { headers }).then((r) => note('DELETE series', r.status())),
        read().then((s) => note('GET occurrences', s)),
        page.request.put(`/api/activities/${created.id}`, { headers, data: body }).then((r) => note('PUT one-off', r.status())),
        read().then((s) => note('GET occurrences', s)),
        read().then((s) => note('GET occurrences', s)),
      ]);
      statuses.push(...results);
    }
    const failures = statuses.filter((s) => s >= 500);
    expect.soft(failed, `${failures.length} of ${statuses.length} requests failed`).toEqual([]);

    // Whatever failed, the history must not hold an occurrence twice.
    const rows = await account.api.get(`/occurrences?from=${from}&to=${to}&timeZone=Europe%2FWarsaw`);
    const keys = rows.map((o: { title: string; startTime: string; activityId: string | null }) => `${o.title}|${o.startTime}|${o.activityId}`);
    expect.soft(keys.length - new Set(keys).size, 'duplicate rows').toBe(0);
  });

  test('i, j) a failed read of the occurrences is reported and does not leave the calendar stale', async ({ page }) => {
    const { day, past } = await midWeek(page);
    await signUp(page);
    await calendar(page);
    await createFromSlot(page, day, past, { title: 'P', duration: 60 });
    await page.route('**/api/occurrences*', (route) => route.fulfill({ status: 500, body: '{}' }));
    const form = await openBlock(page, day, past, 'P');
    await field(form, 'Duration (minutes) *').fill('120');
    await save(page);
    await shot(page, 'failed-read-calendar');
    // The calendar draws only what the server returned: it says it is behind, and catches up on the next read.
    const banner = page.getByRole('alert');
    await expect(banner).toBeVisible();
    await page.unroute('**/api/occurrences*');
    await banner.getByRole('button', { name: 'Try again' }).click();
    await expect(banner).toHaveCount(0);
    const height = await slot(page, day, past).locator('div.z-10').evaluate((b) => (b as HTMLElement).style.height);
    expect.soft(height, 'block height after the save').toBe('120px');
  });

  test('a change in another week than the one Analytics opens on', async ({ page }) => {
    await signUp(page);
    await calendar(page);
    await page.getByRole('button', { name: 'Next week' }).click();
    await createFromSlot(page, 3, 10, { title: 'Next', duration: 120 });
    await analytics(page);
    // Analytics opens on the current week whatever week the Calendar was showing.
    await expectReport(page, { planned: '0' });
    await page.getByRole('button', { name: 'Next week' }).click();
    await expectReport(page, { planned: '2' });
  });

  test('k) a marked future occurrence keeps its mark once it has started, with the edited values', async ({ page }) => {
    test.setTimeout(240_000);
    const { day, hour } = await clock(page);
    test.skip(hour > 21 || day === 0, 'the occurrence has to fall in the same week and day');
    const account = await signUp(page);
    // Two minutes ahead at a whole minute, as the form would make it.
    const soon = new Date(Date.now() + 120_000);
    soon.setSeconds(0, 0);
    const yesterday = new Date(soon.getTime() - 86_400_000);
    const series = await account.api.activity({
      title: 'Soon',
      activityTypeId: STUDY,
      startTime: yesterday.toISOString(),
      durationMinutes: 60,
      ...SERIES_DAILY,
    });
    await account.api.patch(`/activities/${series.id}/status`, { status: 'done', occurrenceStart: soon.toISOString() });
    // Not a change of when it occurs, so the mark stays.
    const { id: _, ...current } = series;
    await account.api.patch(`/activities/${series.id}/status`, { status: 'partiallyDone', occurrenceStart: soon.toISOString() });
    await page.request.put(`/api/activities/${series.id}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
      data: { ...current, durationMinutes: 120 },
    });
    await page.waitForTimeout(Math.max(0, soon.getTime() - Date.now()) + 5_000);
    const rows = await account.api.get(
      `/occurrences?from=${encodeURIComponent(new Date(soon.getTime() - 1000).toISOString())}&to=${encodeURIComponent(new Date(soon.getTime() + 1000).toISOString())}`,
    );
    expect.soft(rows.map((o: { status: string; durationMinutes: number }) => [o.status, o.durationMinutes])).toEqual([['partiallyDone', 120]]);
    await page.reload();
    await analytics(page);
    await expectReport(page, { studied: '1' });
  });

  test('k) a future series occurrence with seconds in its start can be marked', async ({ page }) => {
    const { day, past, laterDaysThisWeek } = await midWeek(page);
    test.skip(laterDaysThisWeek === 0, 'no later day this week');
    const account = await signUp(page);
    const start = new Date(await localIso(page, -3, past));
    start.setSeconds(30);
    await seedDaily(page, account, 'Series', 3, past, { startTime: start.toISOString() });
    await calendar(page);
    const form = await openBlock(page, day + 1, past, 'Series');
    await form.getByRole('group', { name: 'Status of this occurrence' }).getByRole('button', { name: 'Done', exact: true }).click();
    await expect.soft(form.getByText('no occurrence at this time'), 'the API refuses the mark').toHaveCount(0);
  });
});

test.describe('The calendar itself', () => {
  test('overlapping activities are both visible and reachable', async ({ page }) => {
    const { day, future } = await midWeek(page);
    const account = await signUp(page);
    await account.api.activity({ title: 'First', startTime: await localIso(page, 0, future), durationMinutes: 60 });
    await account.api.activity({ title: 'Second', startTime: await localIso(page, 0, future), durationMinutes: 60 });
    await page.reload();
    await calendar(page);
    await slot(page, day, future).scrollIntoViewIfNeeded();
    await shot(page, 'overlap');
    // Each block has to be on top somewhere, or it cannot be seen or clicked.
    for (const title of ['First', 'Second']) {
      const reachable = await slot(page, day, future)
        .locator('div.z-10')
        .filter({ hasText: title })
        .evaluate((block) => {
          const box = block.getBoundingClientRect();
          for (let y = box.top + 1; y < box.bottom; y += 5) {
            for (let x = box.left + 1; x < box.right; x += 5) {
              if (block.contains(document.elementFromPoint(x, y))) return true;
            }
          }
          return false;
        });
      expect.soft(reachable, `"${title}" can be seen and clicked`).toBe(true);
    }
  });

  test('partly overlapping activities and a short block', async ({ page }) => {
    const { day, future } = await midWeek(page);
    const account = await signUp(page);
    await account.api.activity({ title: 'Long', startTime: await localIso(page, 0, future), durationMinutes: 120 });
    await account.api.activity({ title: 'Later', startTime: await localIso(page, 0, future, 30), durationMinutes: 60 });
    await account.api.activity({ title: 'Short', startTime: await localIso(page, -1, future), durationMinutes: 15 });
    await page.reload();
    await calendar(page);
    await slot(page, day, future).scrollIntoViewIfNeeded();
    await shot(page, 'partial-overlap');
    const long = (await slot(page, day, future).locator('div.z-10').filter({ hasText: 'Long' }).boundingBox())!;
    const later = (await slot(page, day, future).locator('div.z-10').filter({ hasText: 'Later' }).boundingBox())!;
    expect.soft(later.x >= long.x + long.width || long.x >= later.x + later.width, 'overlapping blocks side by side').toBe(true);
    const short = slot(page, day - 1, future).locator('div.z-10');
    const box = await short.evaluate((b) => ({ client: b.clientHeight, scroll: b.scrollHeight }));
    expect.soft(box.scroll, `short block content ${box.scroll}px in ${box.client}px`).toBeLessThanOrEqual(box.client);
  });

  test('a block is as tall as its hours in the grid', async ({ page }) => {
    const { day } = await midWeek(page);
    const account = await signUp(page);
    await account.api.activity({ title: 'Long', activityTypeId: 7, startTime: await localIso(page, -1, 8), durationMinutes: 480 });
    await page.reload();
    await calendar(page);
    await slot(page, day - 1, 8).scrollIntoViewIfNeeded();
    const block = (await slot(page, day - 1, 8).locator('div.z-10').boundingBox())!;
    const rowFrom = (await slot(page, day - 1, 8).boundingBox())!;
    const rowTo = (await slot(page, day - 1, 16).boundingBox())!;
    await shot(page, 'long-block');
    expect.soft(block.height, `block ${block.height}px, grid ${rowTo.y - rowFrom.y}px`).toBeCloseTo(rowTo.y - rowFrom.y, 0);
  });

  test('clicking a series occurrence tells which occurrence it is; the form holds the series', async ({ page }) => {
    const { day, past } = await midWeek(page);
    const account = await signUp(page);
    await seedDaily(page, account, 'Series', 3, past);
    await calendar(page);
    const form = await openBlock(page, day - 1, past, 'Series');
    await shot(page, 'series-modal');
    const expectedDay = await page.evaluate((d) => {
      const x = new Date();
      x.setDate(x.getDate() - d);
      return x.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }, 1);
    await expect.soft(form.getByText(`This occurrence: ${expectedDay}`)).toBeVisible();
    // The form edits the whole series, so its date is the first one of the series, not the one clicked.
    const first = await page.evaluate(() => {
      const x = new Date();
      x.setDate(x.getDate() - 3);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    });
    await expect.soft(field(form, 'Date *'), 'date field holds the start of the series').toHaveValue(first);
  });

  test('previous weeks: history is drawn, and deleting the series in the calendar removes all of it', async ({ page }) => {
    const { day, past } = await midWeek(page);
    const account = await signUp(page);
    await account.api.activity({
      title: 'Series',
      activityTypeId: STUDY,
      startTime: await localIso(page, -10, past),
      durationMinutes: 60,
      ...SERIES_DAILY,
    });
    await page.reload();
    await calendar(page);
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect.soft(blocks(page).filter({ hasText: 'Series' })).toHaveCount(Math.min(7, 10 - day));
    await shot(page, 'previous-week');
    await slot(page, day, past).getByText('Series').click();
    page.once('dialog', (dialog) => dialog.accept());
    await modal(page, 'Edit Activity').getByRole('button', { name: 'Delete series' }).click();
    await expect(blocks(page).filter({ hasText: 'Series' })).toHaveCount(0);
    await page.reload();
    await calendar(page);
    await expect(blocks(page).filter({ hasText: 'Series' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(blocks(page).filter({ hasText: 'Series' })).toHaveCount(0);
  });

  test('daylight saving: the week of the autumn change and the spring gap', async ({ page }) => {
    const zone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    test.skip(zone !== 'Europe/Warsaw', 'the dates below are the clock changes of Europe/Warsaw');
    const account = await signUp(page);
    const startSpring = await page.evaluate(() => new Date(2026, 9, 18, 2, 30).toISOString());
    await account.api.activity({
      title: 'Early',
      activityTypeId: STUDY,
      startTime: startSpring,
      durationMinutes: 60,
      ...SERIES_DAILY,
    });
    await page.reload();

    // 25 Oct 2026, 02:30 happens twice in Europe/Warsaw.
    const october = await account.api.get(
      `/occurrences?from=${encodeURIComponent('2026-10-24T22:00:00Z')}&to=${encodeURIComponent('2026-10-25T23:00:00Z')}&timeZone=Europe%2FWarsaw`,
    );
    expect.soft(october.map((o: { startTime: string }) => o.startTime)).toHaveLength(1);

    // 28 Mar 2027, 02:30 does not exist; browser and server have to agree on the hour after.
    const spring = await account.api.get(
      `/occurrences?from=${encodeURIComponent('2027-03-27T23:00:00Z')}&to=${encodeURIComponent('2027-03-28T10:00:00Z')}&timeZone=Europe%2FWarsaw`,
    );
    const browserSpring = await page.evaluate(() => new Date(2027, 2, 28, 2, 30).toISOString());
    expect.soft(new Date(spring[0].startTime).toISOString(), 'gap').toBe(browserSpring);

    // 31 Oct 2027, 02:30 is ambiguous and still in the future: the browser's choice has to be the server's.
    const autumn = await account.api.get(
      `/occurrences?from=${encodeURIComponent('2027-10-30T22:00:00Z')}&to=${encodeURIComponent('2027-10-31T10:00:00Z')}&timeZone=Europe%2FWarsaw`,
    );
    const browserAutumn = await page.evaluate(() => new Date(2027, 9, 31, 2, 30).toISOString());
    expect.soft(new Date(autumn[0].startTime).toISOString(), 'ambiguous hour').toBe(browserAutumn);

    // ...so the Calendar sends a start the server does not know when that occurrence is marked.
    const series = (await account.api.get('/activities'))[0];
    const refused = await page.request.patch(`/api/activities/${series.id}/status`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
      data: { status: 'done', occurrenceStart: browserAutumn },
    });
    expect.soft(refused.status(), 'marking the ambiguous occurrence').toBe(200);

    await calendar(page);
    await shot(page, 'dst-week');
  });

  test('hovering a block and a skipped block', async ({ page }) => {
    const { day, future } = await midWeek(page);
    const account = await signUp(page);
    const series = await account.api.activity({
      title: 'Skipped one',
      startTime: await localIso(page, 0, future),
      durationMinutes: 120,
      ...SERIES_DAILY,
    });
    await account.api.patch(`/activities/${series.id}/status`, { status: 'skipped', occurrenceStart: await localIso(page, 0, future) });
    await page.reload();
    await calendar(page);
    await slot(page, day, future + 1).scrollIntoViewIfNeeded();
    await slot(page, day, future).hover({ position: { x: 60, y: 30 } });
    await page.waitForTimeout(400);
    await shot(page, 'hover-block');
    // The block stays on top of the plus of its hour cell.
    const box = (await slot(page, day, future).boundingBox())!;
    const onBlock = await page.evaluate(
      ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.z-10'),
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect.soft(onBlock).toBe(true);
  });
});
