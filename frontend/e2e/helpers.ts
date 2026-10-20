import { APIRequestContext, Locator, Page, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const PASSWORD = 'Secret123';

/** A student account created through the API, with a client for seeding its data. */
export interface Account {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  api: SeedApi;
}

export async function registerAccount(
  request: APIRequestContext,
  { consent = false, firstName = 'Erin', lastName = 'Tester' } = {},
): Promise<Account> {
  const email = `e2e-${randomUUID()}@example.com`;
  const response = await request.post('/api/auth/register', {
    data: { firstName, lastName, dateOfBirth: '2000-05-10', email, password: PASSWORD, dataPermission: consent },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const { accessToken } = await response.json();
  const api = new SeedApi(request, accessToken);
  const me = await api.get('/auth/me');
  return { id: me.id, email, password: PASSWORD, accessToken, api };
}

/** Signs in through the form. */
export async function signInWithForm(page: Page, email: string, password = PASSWORD) {
  await page.goto('/');
  await field(page, 'Email Address *').fill(email);
  await field(page, 'Password *').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

/**
 * Registers a new student through the API and opens the app signed in as them, past the first-visit
 * screen unless firstVisit is set.
 */
export async function signUp(page: Page, options: { consent?: boolean; firstVisit?: boolean } = {}) {
  const account = await registerAccount(page.request, options);
  await signInWithForm(page, account.email);
  if (options.firstVisit) {
    await expect(page.getByRole('heading', { name: 'Welcome to MedStudy Planner' })).toBeVisible();
  } else {
    await page.getByRole('button', { name: 'Start Fresh' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  }
  return account;
}

/** Opens a view from the sidebar. */
export async function openView(page: Page, button: string, heading: string) {
  await page.getByRole('navigation').getByRole('button', { name: button, exact: true }).click();
  await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
}

/**
 * The control that belongs to a visible label. The forms put a <label> next to its input without htmlFor,
 * so this follows the label to the first input, select or textarea in the element after it.
 */
export function field(scope: Page | Locator, label: string): Locator {
  return scope
    .locator(
      `xpath=//label[normalize-space(.)="${label}"]/following-sibling::*[1]/descendant-or-self::*[self::input or self::select or self::textarea][1]`,
    )
    .first();
}

/** The open modal with the given title. */
export function modal(page: Page, title: string): Locator {
  return page.locator('.fixed').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

/** A local date as YYYY-MM-DD, offset by whole days from today. */
export function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Authenticated JSON calls to the API, for arranging data that a test does not click together. */
export class SeedApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly accessToken: string,
  ) {}

  private headers() {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  async get(path: string) {
    const response = await this.request.get(`/api${path}`, { headers: this.headers() });
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.json();
  }

  async post(path: string, data: unknown) {
    const response = await this.request.post(`/api${path}`, { headers: this.headers(), data });
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.json();
  }

  async patch(path: string, data: unknown) {
    const response = await this.request.patch(`/api${path}`, { headers: this.headers(), data });
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.json();
  }

  subject(overrides: Record<string, unknown> = {}) {
    return this.post('/subjects', {
      name: 'Anatomy',
      examDate: dateInDays(30),
      planningMethodId: 1,
      priority: 5,
      studyMode: 'relaxed',
      colorHex: '#3b82f6',
      ...overrides,
    });
  }

  topic(subjectId: string, overrides: Record<string, unknown> = {}) {
    return this.post(`/subjects/${subjectId}/topics`, { title: 'Heart', notes: null, feedback: 'red', ...overrides });
  }

  activity(overrides: Record<string, unknown> = {}) {
    return this.post('/activities', {
      subjectId: null,
      topicId: null,
      title: 'Activity',
      activityTypeId: 1,
      priority: 3,
      startTime: new Date().toISOString(),
      durationMinutes: 60,
      isRecurring: false,
      recurrence: null,
      isNegotiable: true,
      notes: null,
      status: 'scheduled',
      ...overrides,
    });
  }
}
