import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { API, fakeApi } from '../test/fakeApi';
import { server } from '../test/setup';
import { field, renderSignedOut, setValue } from '../test/render';
import { tokenStorage } from '../services/http';

const signInButton = () => screen.getByRole('button', { name: 'Sign In' });

describe('AuthModal', () => {
  describe('Sign In', () => {
    it('signs in with valid credentials and opens the dashboard', async () => {
      const account = fakeApi.addUser({ email: 'jane@example.com', password: 'Secret123' });
      localStorage.setItem(`medapp.setupDone.${account.id}`, '1');
      const { events } = renderSignedOut();

      await events.type(field('Email Address *'), 'jane@example.com');
      await events.type(field('Password *'), 'Secret123');
      await events.click(signInButton());

      expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      expect(fakeApi.writes(/auth\/login/)[0].body).toEqual({ email: 'jane@example.com', password: 'Secret123' });
      expect(tokenStorage.getAccessToken()).toMatch(/^access-/);
      expect(tokenStorage.getRefreshToken()).toMatch(/^refresh-/);
    });

    it('shows the API message for wrong credentials and stays on the form', async () => {
      fakeApi.addUser({ email: 'jane@example.com', password: 'Secret123' });
      const { events } = renderSignedOut();

      await events.type(field('Email Address *'), 'jane@example.com');
      await events.type(field('Password *'), 'Wrong1234');
      await events.click(signInButton());

      expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
      expect(signInButton()).toBeEnabled();
      expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it('explains the rate limit when the API answers 429', async () => {
      fakeApi.failNext('POST', /auth\/login/, 429, {});
      const { events } = renderSignedOut();

      await events.type(field('Email Address *'), 'jane@example.com');
      await events.type(field('Password *'), 'Secret123');
      await events.click(signInButton());

      expect(await screen.findByText('Too many attempts. Please wait a minute and try again.')).toBeInTheDocument();
    });

    it('disables the button while the request is running', async () => {
      let answer!: () => void;
      server.use(
        http.post(`${API}/auth/login`, async () => {
          await new Promise<void>((resolve) => (answer = resolve));
          return HttpResponse.json({ title: 'Invalid email or password.' }, { status: 401 });
        }),
      );
      const { events } = renderSignedOut();

      await events.type(field('Email Address *'), 'jane@example.com');
      await events.type(field('Password *'), 'Secret123');
      await events.click(signInButton());

      expect(await screen.findByRole('button', { name: 'Please wait...' })).toBeDisabled();
      answer();
      expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
      expect(signInButton()).toBeEnabled();
    });
  });

  describe('switching modes', () => {
    it('toggles between sign in and registration and clears the error', async () => {
      const { events } = renderSignedOut();
      await events.type(field('Email Address *'), 'nobody@example.com');
      await events.type(field('Password *'), 'Secret123');
      await events.click(signInButton());
      await screen.findByText('Invalid email or password.');

      await events.click(screen.getByRole('button', { name: "Don't have an account? Sign up" }));
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(field('First Name *')).toBeInTheDocument();
      expect(screen.queryByText('Invalid email or password.')).not.toBeInTheDocument();

      await events.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.queryByText('First Name *')).not.toBeInTheDocument();
    });
  });

  describe('Create Account', () => {
    async function fillRegistration(events: ReturnType<typeof renderSignedOut>['events'], password: string) {
      await events.click(screen.getByRole('button', { name: "Don't have an account? Sign up" }));
      await events.type(field('First Name *'), '  Jane ');
      await events.type(field('Last Name *'), 'Doe');
      setValue(field('Date of Birth *'), '2000-01-15');
      await events.type(field('Email Address *'), 'new@example.com');
      await events.type(field('Password *'), password);
    }

    it.each([
      ['short1A', 'Password must be at least 8 characters long.'],
      ['lowercase1', 'Password must contain at least one uppercase letter.'],
      ['UPPERCASE1', 'Password must contain at least one lowercase letter.'],
      ['NoDigitsHere', 'Password must contain at least one digit.'],
    ])('rejects the password %s before calling the API', async (password, message) => {
      const { events } = renderSignedOut();
      await fillRegistration(events, password);

      await events.click(screen.getByRole('button', { name: 'Create Account' }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(fakeApi.writes()).toHaveLength(0);
    });

    it('registers with the trimmed fields and the consent choice, then signs in', async () => {
      const { events } = renderSignedOut();
      await fillRegistration(events, 'Secret123');
      await events.click(screen.getByLabelText(/Include my study data/));

      await events.click(screen.getByRole('button', { name: 'Create Account' }));

      // A new account starts with the demo/fresh choice.
      expect(await screen.findByRole('heading', { name: 'Welcome to MedStudy Planner' })).toBeInTheDocument();
      expect(fakeApi.writes(/auth\/register/)[0].body).toEqual({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '2000-01-15',
        email: 'new@example.com',
        password: 'Secret123',
        dataPermission: true,
      });
    });

    it('shows the server field error for a taken email', async () => {
      fakeApi.addUser({ email: 'new@example.com' });
      const { events } = renderSignedOut();
      await fillRegistration(events, 'Secret123');

      await events.click(screen.getByRole('button', { name: 'Create Account' }));

      expect(await screen.findByText('Email is already registered.')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled());
    });
  });
});
