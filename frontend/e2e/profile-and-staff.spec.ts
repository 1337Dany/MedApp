import { expect, test } from '@playwright/test';
import { field, modal, openView, registerAccount, signInWithForm, signUp } from './helpers';

const DEMO_PASSWORD = 'Demo1234!';

test.describe('Profile', () => {
  test('Profile Settings saves the profile and consent; Cancel and Close discard changes', async ({ page }) => {
    const account = await signUp(page);

    await page.getByRole('button', { name: /Erin Tester/ }).click();
    await expect(page.getByText(account.email)).toBeVisible();
    await page.getByRole('button', { name: 'Profile Settings' }).click();
    let form = modal(page, 'Profile Settings');
    await expect(field(form, 'First Name *')).toHaveValue('Erin');
    await expect(field(form, 'Date of Birth *')).toHaveValue('2000-05-10');

    await field(form, 'First Name *').fill('Erika');
    await field(form, 'Date of Birth *').fill('1999-09-09');
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Erika Tester/ })).toBeVisible();
    expect(await account.api.get('/auth/me')).toMatchObject({
      firstName: 'Erika',
      dateOfBirth: '1999-09-09',
      dataPermission: true,
    });

    for (const button of ['Cancel', 'Close']) {
      await page.getByRole('button', { name: /Erika Tester/ }).click();
      await page.getByRole('button', { name: 'Profile Settings' }).click();
      form = modal(page, 'Profile Settings');
      await field(form, 'First Name *').fill('Discarded');
      await form.getByRole('button', { name: button }).click();
      await expect(form).toHaveCount(0);
    }
    expect((await account.api.get('/auth/me')).firstName).toBe('Erika');
  });

  test('the account menu closes on an outside click', async ({ page }) => {
    const account = await signUp(page);
    await page.getByRole('button', { name: /Erin Tester/ }).click();
    await expect(page.getByText(account.email)).toBeVisible();

    await page.mouse.click(10, 500);
    await expect(page.getByText(account.email)).toHaveCount(0);
  });
});

test.describe('Teacher', () => {
  test('sees the aggregated class analytics and no student views', async ({ page }) => {
    await signInWithForm(page, 'carol.teacher@example.com', DEMO_PASSWORD);

    await expect(page.getByRole('heading', { name: 'Teacher Dashboard' })).toBeVisible();
    await expect(page.getByText('Total Students')).toBeVisible();
    expect(Number(await page.getByText('Total Students').locator('+ p').textContent())).toBeGreaterThanOrEqual(5);
    await expect(page.getByText('Subject Performance Overview')).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('button')).toHaveText(['Class Overview']);
  });
});

test.describe('Admin', () => {
  test('changes roles in the Users view; the own role is locked', async ({ page, browser }) => {
    const student = await registerAccount(page.request, { firstName: 'Promo', lastName: `Candidate${Date.now()}` });
    const name = `Promo ${(await student.api.get('/auth/me')).lastName}`;

    await signInWithForm(page, 'admin@example.com', DEMO_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Teacher Dashboard' })).toBeVisible();
    await openView(page, 'Users', 'Users');
    await openView(page, 'Class Overview', 'Teacher Dashboard');
    await openView(page, 'Users', 'Users');

    await expect(page.getByRole('combobox', { name: 'Role of Site Admin' })).toBeDisabled();
    const role = page.getByRole('combobox', { name: `Role of ${name}` });
    await expect(role).toHaveValue('student');

    await role.selectOption('teacher');
    await expect(role).toBeEnabled();
    await expect(role).toHaveValue('teacher');

    // The new role applies at the next sign-in.
    const other = await browser.newPage();
    await signInWithForm(other, student.email);
    await expect(other.getByRole('heading', { name: 'Teacher Dashboard' })).toBeVisible();
    await other.close();

    await role.selectOption('student');
    await expect(role).toHaveValue('student');
    await page.reload();
    await openView(page, 'Users', 'Users');
    await expect(page.getByRole('combobox', { name: `Role of ${name}` })).toHaveValue('student');
  });
});
