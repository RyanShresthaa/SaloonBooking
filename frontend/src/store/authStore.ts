import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff' | 'customer';
  /** Operational tenant for staff/admin; may be absent for customers. */
  salonId?: string | null;
  /** Public marketplace slug for this tenant, when `salonId` matches a listing. */
  salonSlug?: string | null;
  loyaltyPoints?: number;
  marketingEmailOptIn?: boolean;
  clientNotes?: string | null;
  allergies?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  updateUser: (partial) =>
    set((state) => {
      if (!state.user) return state;
      const user = { ...state.user, ...partial } as User;
      localStorage.setItem('user', JSON.stringify(user));
      return { user };
    }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        // corrupted storage — clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },
}));
