import { describe, expect, it, vi } from 'vitest';
import { ApiError, authenticatedFetch, publicFetch, setSessionExpiredHandler, tokenStorage } from './http';
import { fakeApi } from '../test/fakeApi';

// The ApiError a request rejects with (fails the test if it resolves).
const rejection = (request: Promise<unknown>) =>
  request.then(
    () => {
      throw new Error('Expected the request to fail');
    },
    (error: ApiError) => error,
  );

function signIn() {
  const user = fakeApi.addUser();
  tokenStorage.setTokens(fakeApi.issueTokens(user.id));
  return user;
}

describe('http', () => {
  it('sends the access token and parses JSON', async () => {
    const user = signIn();
    const me = await authenticatedFetch<{ id: string }>('/auth/me');
    expect(me.id).toBe(user.id);
  });

  it('returns undefined for 204 responses', async () => {
    signIn();
    await expect(
      authenticatedFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: 'x' }) }),
    ).resolves.toBeUndefined();
  });

  it('parallel 401s share one refresh, so the single-use refresh token is sent only once', async () => {
    signIn();
    fakeApi.expireAccessTokens();

    await Promise.all([authenticatedFetch('/subjects'), authenticatedFetch('/topics'), authenticatedFetch('/activities')]);

    expect(fakeApi.requests.filter((r) => r.path === '/auth/refresh')).toHaveLength(1);
    expect(fakeApi.requests.filter((r) => r.path === '/subjects')).toHaveLength(2);
  });

  it('clears the session and reports it when the refresh token is rejected', async () => {
    signIn();
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    fakeApi.expireAccessTokens();
    fakeApi.failNext('POST', /auth\/refresh/, 401);

    const error = await rejection(authenticatedFetch('/subjects'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(expired).toHaveBeenCalledOnce();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('turns ProblemDetails into ApiError: field errors first, then detail, then title', async () => {
    fakeApi.failNext('POST', /auth\/login/, 400, { title: 'Bad', detail: 'Detail', errors: { Email: ['Email is invalid.'] } });
    fakeApi.failNext('POST', /auth\/login/, 400, { title: 'Bad', detail: 'Detail' });
    fakeApi.failNext('POST', /auth\/login/, 400, { title: 'Bad' });
    fakeApi.failNext('POST', /auth\/login/, 503, {});
    const login = () => rejection(publicFetch('/auth/login', { method: 'POST', body: '{}' }));

    const first = await login();
    expect(first.message).toBe('Email is invalid.');
    expect(first.fieldErrors).toEqual({ Email: ['Email is invalid.'] });
    expect((await login()).message).toBe('Detail');
    expect((await login()).message).toBe('Bad');
    expect((await login()).message).toBe('Request failed (503)');
  });
});
