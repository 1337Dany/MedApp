import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useAuthStore } from '../store/useAuthStore';
import { tokenStorage } from '../services/http';
import { FakeUser, fakeApi } from './fakeApi';

interface RenderOptions {
  user?: Partial<FakeUser>;
  /** Show the first-visit demo/fresh choice (by default it is marked as done). */
  firstVisit?: boolean;
  /** Runs after the user exists and before the app loads, to seed the fake API. */
  seed?: (user: FakeUser) => void;
}

/** Renders the whole app signed in as a new user of the fake API, the way a reload with a stored session does. */
export async function renderApp({ user: overrides, firstVisit = false, seed }: RenderOptions = {}) {
  const user = fakeApi.addUser(overrides);
  seed?.(user);
  tokenStorage.setTokens(fakeApi.issueTokens(user.id));
  if (!firstVisit) localStorage.setItem(`medapp.setupDone.${user.id}`, '1');
  useAuthStore.setState({ isLoading: true });
  await useAuthStore.getState().restoreSession();

  const events = userEvent.setup();
  const result = render(<App />);
  return { ...result, user, events };
}

/** Renders the app with no stored session (the sign-in screen). */
export function renderSignedOut() {
  const events = userEvent.setup();
  return { ...render(<App />), events };
}

/**
 * The input, select or textarea next to a visible label. The forms place a <label> and its control side by
 * side without htmlFor, so getByLabelText only works for the checkboxes and radios wrapped in their label.
 */
export function field(label: string | RegExp, container: HTMLElement = document.body): HTMLInputElement {
  const labelElement = within(container).getByText(label, { selector: 'label' });
  const control = labelElement.parentElement?.querySelector('input, select, textarea');
  if (!control) throw new Error(`No control next to label ${String(label)}`);
  return control as HTMLInputElement;
}

/** Sets the value of inputs that user-event cannot type into reliably (date, time, range). */
export function setValue(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

/** The open modal (the fixed overlay that contains the given heading). */
export async function findModal(heading: string | RegExp) {
  const title = await screen.findByRole('heading', { name: heading });
  return title.closest('.fixed') as HTMLElement;
}

export const nav = (name: string) => screen.getByRole('button', { name });
