import { create } from 'zustand';
import { User, AuthState } from '../types/auth';
import { authAPI } from '../services/api';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: 'student' | 'teacher') => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    
    try {
      const data = await authAPI.login(email, password);
      
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      
      // Store in localStorage for persistence
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, name: string, role: 'student' | 'teacher') => {
    set({ isLoading: true });
    
    try {
      const data = await authAPI.register(email, password, name, role);
      
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      
      // Store in localStorage for persistence
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    authAPI.logout().catch(console.error);
    
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));

// Initialize auth state from localStorage
if (typeof window !== 'undefined') {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      useAuthStore.getState().setUser(user);
    } catch (error) {
      localStorage.removeItem('user');
    }
  }
}