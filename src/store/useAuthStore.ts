import { api } from "@/lib/api";
import { getErrorMessage, isUnauthorizedError } from "@/lib/error";
import { create } from "zustand";

// Keep your existing User interface
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  hasCheckedAuth: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  fetchUser: (options?: { force?: boolean }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  hasCheckedAuth: false,

  setUser: (user: User | null) =>
    set({ user, hasCheckedAuth: true, isLoading: false }),

  logout: async () => {
    await api.get("/auth/logout");
    set({ user: null, hasCheckedAuth: true, isLoading: false });
  },

  fetchUser: async (options) => {
    const { force = false } = options ?? {};

    if (!force) {
      const state = useAuthStore.getState();
      if (state.hasCheckedAuth || state.isLoading) {
        return;
      }
    }

    set({ isLoading: true });
    try {
      const userData = await api.get<User>("/auth/me");
      set({ user: userData, hasCheckedAuth: true, isLoading: false });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        set({ user: null, hasCheckedAuth: true, isLoading: false });
        return;
      }
      console.error(
        "Failed to fetch user session:",
        getErrorMessage(error),
        error,
      );
      set({ user: null, hasCheckedAuth: true, isLoading: false });
    }
  },
}));
