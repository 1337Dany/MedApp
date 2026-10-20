import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PASSWORD, field, registerAccount, signInWithForm } from './helpers';

test.describe('Sign in and registration', () => {
  test('Create Account validates the password, registers and lands on the first-visit screen', async ({ page }) => {
    const email = `e2e-${randomUUID()}@example.com`;
    await page.goto('/');
    await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

    await field(page, 'First Name *').fill('Nora');
    await field(page, 'Last Name *').fill('Newcomer');
    await field(page, 'Date of Birth *').fill('2001-03-04');
    await field(page, 'Email Address *').fill(email);
    await field(page, 'Password *').fill('weakpass');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Password must contain at least one uppercase letter.')).toBeVisible();

    await field(page, 'Password *').fill(PASSWORD);
    await page.getByLabel(/Include my study data/).check();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByRole('heading', { name: 'Welcome to MedStudy Planner' })).toBeVisible();
  });

  test('Create Account shows the server error for an email that is taken', async ({ page }) => {
    const existing = await registerAccount(page.request);
    await page.goto('/');
    await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();
    await field(page, 'First Name *').fill('Dup');
    await field(page, 'Last Name *').fill('Licate');
    await field(page, 'Date of Birth *').fill('2001-03-04');
    await field(page, 'Email Address *').fill(existing.email);
    await field(page, 'Password *').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
  });

  test('Sign In rejects a wrong password and accepts the right one', async ({ page }) => {
    const account = await registerAccount(page.request);

    await signInWithForm(page, account.email, 'Wrong12345');
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    await field(page, 'Password *').fill(account.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome to MedStudy Planner' })).toBeVisible();
  });

  test('the mode links switch between sign in and registration', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();
    await expect(field(page, 'First Name *')).toBeVisible();
    await page.getByRole('button', { name: 'Already have an account? Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('First Name *')).toHaveCount(0);
  });

  test('the session survives a reload; Sign Out ends it on the server too', async ({ page }) => {
    const account = await registerAccount(page.request);
    await signInWithForm(page, account.email);
    await page.getByRole('button', { name: 'Start Fresh' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));

    await page.getByRole('button', { name: /Erin Tester/ }).click();
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    const refresh = await page.request.post('/api/auth/refresh', { data: { refreshToken } });
    expect(refresh.status()).toBe(401);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });
});

test.describe('First visit', () => {
  test('Start Fresh opens an empty dashboard and is not asked again', async ({ page }) => {
    const account = await registerAccount(page.request);
    await signInWithForm(page, account.email);

    await page.getByRole('button', { name: 'Start Fresh' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Total Subjects').locator('+ p')).toHaveText('0');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('Start with Demo Data fills the account through the API', async ({ page }) => {
    const account = await registerAccount(page.request);
    await signInWithForm(page, account.email);

    await page.getByRole('button', { name: 'Start with Demo Data' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Total Subjects').locator('+ p')).toHaveText('4');
    await expect(page.getByText('Total Topics').locator('+ p')).toHaveText('17');
    expect(await account.api.get('/activities')).toHaveLength(13);
  });
});
