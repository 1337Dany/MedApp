import { create } from 'zustand';
import { User, AuthState, RegisterPayload } from '../types/auth';
import { authAPI, ProfileUpdate, usersAPI } from '../services/api';
import { setSessionExpiredHandler, tokenStorage } from '../services/http';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  restoreSession: () => Promise<void>;
  updateProfile: (profile: ProfileUpdate) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  // True until the stored session (if any) has been checked against the API.
  isLoading: true,

  login: async (email, password) => {
    const tokens = await authAPI.login(email, password);
    tokenStorage.setTokens(tokens);
    try {
      const user = await authAPI.getCurrentUser();
      set({ user, isAuthenticated: true });
    } catch (error) {
      tokenStorage.clearTokens();
      throw error;
    }
  },

  register: async (payload) => {
    const tokens = await authAPI.register(payload);
    tokenStorage.setTokens(tokens);
    try {
      const user = await authAPI.getCurrentUser();
      set({ user, isAuthenticated: true });
    } catch (error) {
      tokenStorage.clearTokens();
      throw error;
    }
  },

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
}));

setSessionExpiredHandler(() => useAuthStore.getState().setUser(null));

if (typeof window !== 'undefined') {
  // Drop the user object the mock auth used to keep; the API is the source of truth now.
  localStorage.removeItem('user');
  useAuthStore.getState().restoreSession();
}
