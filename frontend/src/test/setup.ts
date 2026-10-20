import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { fakeApi } from './fakeApi';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';

export const server = setupServer(...fakeApi.handlers);

// Recharts' ResponsiveContainer measures its parent; jsdom has no layout.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

beforeEach(() => {
  fakeApi.reset();
  localStorage.clear();
  useStore.getState().reset();
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  // Delete buttons ask for confirmation; tests opt into "Cancel" with mockReturnValueOnce(false).
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  // The store logs failed background refreshes; keep the output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => server.close());
