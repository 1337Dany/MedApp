import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { fakeApi } from '../test/fakeApi';
import { field, findModal, renderApp, setValue } from '../test/render';
import { tokenStorage } from '../services/http';

const menuButton = () => screen.getByRole('button', { name: /Jane Doe/ });

describe('UserProfile menu', () => {
  it('opens with the account details and closes on an outside click', async () => {
    const { events, user } = await renderApp();
    await screen.findByRole('heading', { name: 'Dashboard' });

    await events.click(menuButton());
    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.getByText('Role: student')).toBeInTheDocument();

    // The transparent backdrop behind the menu.
    await events.click(document.querySelector('.fixed.inset-0.z-10')!);
    expect(screen.queryByText(user.email)).not.toBeInTheDocument();
  });

  it('"Sign Out" revokes the refresh token and returns to sign in', async () => {
    const { events } = await renderApp();
    await screen.findByRole('heading', { name: 'Dashboard' });
    const refreshToken = tokenStorage.getRefreshToken();

    await events.click(menuButton());
    await events.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(fakeApi.writes(/auth\/logout/)[0].body).toEqual({ refreshToken });
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('"Sign Out" still ends the local session when the API call fails', async () => {
    fakeApi.failNext('POST', /auth\/logout/, 500);
    const { events } = await renderApp();
    await screen.findByRole('heading', { name: 'Dashboard' });

    await events.click(menuButton());
    await events.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});

describe('ProfileModal', () => {
  async function openProfile() {
    const rendered = await renderApp();
    await screen.findByRole('heading', { name: 'Dashboard' });
    await rendered.events.click(menuButton());
    await rendered.events.click(screen.getByRole('button', { name: 'Profile Settings' }));
    return { ...rendered, modal: await findModal('Profile Settings') };
  }

  it('is prefilled with the current profile', async () => {
    const { modal, user } = await openProfile();

    expect(field('First Name *', modal)).toHaveValue('Jane');
    expect(field('Last Name *', modal)).toHaveValue('Doe');
    expect(field('Date of Birth *', modal)).toHaveValue('2000-01-15');
    expect(within(modal).getByText(user.email)).toBeInTheDocument();
    expect(within(modal).getByRole('checkbox')).not.toBeChecked();
  });

  it('"Save" sends the trimmed profile and consent and updates the header', async () => {
    const { modal, events } = await openProfile();

    await events.clear(field('First Name *', modal));
    await events.type(field('First Name *', modal), ' Janet ');
    await events.clear(field('Last Name *', modal));
    await events.type(field('Last Name *', modal), 'Smith');
    setValue(field('Date of Birth *', modal), '1999-12-31');
    await events.click(within(modal).getByRole('checkbox'));
    await events.click(within(modal).getByRole('button', { name: 'Save' }));

    expect(fakeApi.writes(/users\/me/)[0].body).toEqual({
      firstName: 'Janet',
      lastName: 'Smith',
      dateOfBirth: '1999-12-31',
      dataPermission: true,
    });
    expect(screen.queryByRole('heading', { name: 'Profile Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Janet Smith/ })).toBeInTheDocument();
  });

  it('keeps the modal open and shows the API error when saving fails', async () => {
    fakeApi.failNext('PUT', /users\/me/, 400, { errors: { DateOfBirth: ['Date of birth must be in the past.'] } });
    const { modal, events } = await openProfile();

    await events.click(within(modal).getByRole('button', { name: 'Save' }));

    expect(await within(modal).findByText('Date of birth must be in the past.')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it.each(['Cancel', 'Close'])('"%s" closes without saving', async (button) => {
    const { modal, events } = await openProfile();

    await events.type(field('First Name *', modal), 'x');
    await events.click(within(modal).getByRole('button', { name: button }));

    expect(screen.queryByRole('heading', { name: 'Profile Settings' })).not.toBeInTheDocument();
    expect(fakeApi.writes()).toHaveLength(0);
    expect(menuButton()).toHaveTextContent('Jane Doe');
  });

  it('"Set New Password" changes the password, keeps the session and leaves the modal open', async () => {
    const { modal, events, user } = await openProfile();
    const oldPassword = user.password;

    await events.click(within(modal).getByRole('button', { name: 'Change Password' }));
    await events.type(field('Current Password', modal), oldPassword);
    await events.type(field('New Password', modal), 'Brand-new1');
    await events.click(within(modal).getByRole('button', { name: 'Set New Password' }));

    expect(await within(modal).findByText('Password changed. Other devices have been signed out.')).toBeInTheDocument();
    expect(fakeApi.writes(/auth\/change-password/)[0].body).toEqual({
      currentPassword: oldPassword,
      newPassword: 'Brand-new1',
    });
    expect(fakeApi.users.find((u) => u.id === user.id)!.password).toBe('Brand-new1');
    // The tokens of the answer replaced the revoked ones: the next request is still signed in.
    await events.click(within(modal).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('heading', { name: 'Profile Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('checks the new password before sending and shows the API error for a wrong current one', async () => {
    const { modal, events } = await openProfile();

    await events.click(within(modal).getByRole('button', { name: 'Change Password' }));
    await events.type(field('Current Password', modal), 'not-my-password');
    await events.type(field('New Password', modal), 'weak');
    await events.click(within(modal).getByRole('button', { name: 'Set New Password' }));
    expect(within(modal).getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
    expect(fakeApi.writes()).toHaveLength(0);

    await events.clear(field('New Password', modal));
    await events.type(field('New Password', modal), 'Brand-new1');
    await events.click(within(modal).getByRole('button', { name: 'Set New Password' }));
    expect(await within(modal).findByText('The current password is not correct.')).toBeInTheDocument();

    await events.click(within(modal).getByRole('button', { name: 'Keep Current' }));
    expect(within(modal).queryByText('The current password is not correct.')).not.toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Change Password' })).toBeInTheDocument();
  });

  it('"Delete Account" asks for the password, deletes the account and returns to sign in', async () => {
    const { modal, events, user } = await openProfile();

    await events.click(within(modal).getByRole('button', { name: 'Delete Account' }));
    await events.click(within(modal).getByRole('button', { name: 'Delete My Account for Good' }));
    expect(within(modal).getByText('Enter your password to confirm.')).toBeInTheDocument();

    await events.type(field('Password to Confirm', modal), 'not-my-password');
    await events.click(within(modal).getByRole('button', { name: 'Delete My Account for Good' }));
    expect(await within(modal).findByText('The password is not correct.')).toBeInTheDocument();
    expect(fakeApi.users).toHaveLength(1);

    await events.clear(field('Password to Confirm', modal));
    await events.type(field('Password to Confirm', modal), user.password);
    await events.click(within(modal).getByRole('button', { name: 'Delete My Account for Good' }));

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(fakeApi.users).toHaveLength(0);
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('"Keep My Account" closes the delete form without a request', async () => {
    const { modal, events } = await openProfile();

    await events.click(within(modal).getByRole('button', { name: 'Delete Account' }));
    await events.click(within(modal).getByRole('button', { name: 'Keep My Account' }));

    expect(within(modal).queryByText('Password to Confirm')).not.toBeInTheDocument();
    expect(fakeApi.writes()).toHaveLength(0);
  });

  it('does not offer the consent switch to staff', async () => {
    const { events } = await renderApp({ user: { role: 'teacher' } });
    await screen.findByRole('heading', { name: 'Teacher Dashboard' });

    await events.click(menuButton());
    await events.click(screen.getByRole('button', { name: 'Profile Settings' }));
    const modal = await findModal('Profile Settings');

    expect(within(modal).queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
