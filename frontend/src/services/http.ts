import { AuthTokens } from '../types/auth';

// Relative by default: nginx (compose) and the Vite dev proxy forward /api to the backend.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (tokens: AuthTokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/** Error carrying the HTTP status and the backend's ProblemDetails message(s). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Called when the session can no longer be refreshed (set by the auth store).
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

const toApiError = async (response: Response): Promise<ApiError> => {
  const problem = await response.json().catch(() => null);
  const fieldErrors: Record<string, string[]> = problem?.errors ?? {};
  const firstFieldError = Object.values(fieldErrors).flat()[0];
  const message =
    firstFieldError ||
    problem?.detail ||
    problem?.title ||
    (response.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : '') ||
    `Request failed (${response.status})`;
  return new ApiError(message, response.status, fieldErrors);
};

const parseBody = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

const send = (url: string, options: RequestInit, accessToken: string | null) =>
  fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
  });

/** Anonymous request (login, register, refresh). */
export const publicFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await send(url, options, null);
  if (!response.ok) throw await toApiError(response);
  return parseBody<T>(response);
};

// One refresh at a time: parallel 401s wait for the same rotation instead of
// each sending the (single-use) refresh token and triggering replay detection.
let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) return null;
      try {
        const tokens = await publicFetch<AuthTokens>('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
        tokenStorage.setTokens(tokens);
        return tokens.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

/** Request with the access token; on 401 refreshes once and retries. */
export const authenticatedFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  let response = await send(url, options, tokenStorage.getAccessToken());

  if (response.status === 401) {
    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      tokenStorage.clearTokens();
      onSessionExpired?.();
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
    response = await send(url, options, newAccessToken);
  }

  if (!response.ok) throw await toApiError(response);
  return parseBody<T>(response);
};
