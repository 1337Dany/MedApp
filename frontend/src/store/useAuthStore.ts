import { create } from 'zustand';
import { RegisterPayload, User, AuthState } from '../types/auth';
import { authAPI, tokenStorage } from '../services/api';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  loadCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const tokens = await authAPI.login(email, password);
      tokenStorage.setTokens(tokens);

      const user = await authAPI.getCurrentUser();

      set({ user, isAuthenticated: true, isLoading: false });
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      tokenStorage.clearTokens();
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true });

    try {
      const tokens = await authAPI.register(payload);
      tokenStorage.setTokens(tokens);

      const user = await authAPI.getCurrentUser();

      set({ user, isAuthenticated: true, isLoading: false });
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      tokenStorage.clearTokens();
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken();

    if (refreshToken) {
      try {
        await authAPI.logout(refreshToken);
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    tokenStorage.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  loadCurrentUser: async () => {
    const accessToken = tokenStorage.getAccessToken();
    if (!accessToken) return;

    set({ isLoading: true });
    try {
      const user = await authAPI.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// On app start, try to restore the session from a stored access token by
// asking the backend who we are (handles token refresh transparently).
if (typeof window !== 'undefined') {
  useAuthStore.getState().loadCurrentUser();
}