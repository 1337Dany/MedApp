import { create } from 'zustand';
import { User, AuthState, AuthTokens, RegisterPayload } from '../types/auth';
import { authAPI, ProfileUpdate, usersAPI } from '../services/api';
import { setSessionExpiredHandler, tokenStorage } from '../services/http';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  restoreSession: () => Promise<void>;
  updateProfile: (profile: ProfileUpdate) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => {
  // Login and registration both answer with tokens; the user behind them comes from /auth/me.
  const startSession = async (tokens: AuthTokens) => {
    tokenStorage.setTokens(tokens);
    try {
      const user = await authAPI.getCurrentUser();
      set({ user, isAuthenticated: true });
    } catch (error) {
      tokenStorage.clearTokens();
      throw error;
    }
  };

  return {
    user: null,
    isAuthenticated: false,
    // True until the stored session (if any) has been checked against the API.
    isLoading: true,

    login: async (email, password) => startSession(await authAPI.login(email, password)),

    register: async (payload) => startSession(await authAPI.register(payload)),

    logout: async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        // Best effort: the local session ends even if the API call fails.
        await authAPI.logout(refreshToken).catch(console.error);
      }
      tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false });
    },

    setUser: (user) => {
      set({ user, isAuthenticated: !!user });
    },

    updateProfile: async (profile) => {
      const user = await usersAPI.updateMe(profile);
      set({ user });
    },

    // The API signs every other session out and answers with new tokens for this one.
    changePassword: async (currentPassword, newPassword) => {
      tokenStorage.setTokens(await authAPI.changePassword(currentPassword, newPassword));
    },

    // The account and its data are gone on the server; the local session ends with it.
    deleteAccount: async (password) => {
      await usersAPI.deleteMe(password);
      tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false });
    },

    restoreSession: async () => {
      if (!tokenStorage.getRefreshToken()) {
        set({ isLoading: false });
        return;
      }
      try {
        // /me refreshes the access token transparently when it has expired.
        const user = await authAPI.getCurrentUser();
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        tokenStorage.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },
  };
});

setSessionExpiredHandler(() => useAuthStore.getState().setUser(null));

if (typeof window !== 'undefined') {
  // Drop the user object the mock auth used to keep; the API is the source of truth now.
  localStorage.removeItem('user');
  useAuthStore.getState().restoreSession();
}
