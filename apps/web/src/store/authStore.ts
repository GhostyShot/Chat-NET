import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse } from "@chatnet/shared";

interface AuthState {
  auth: AuthResponse | null;
  sessionRefreshDone: boolean;
  setAuth: (auth: AuthResponse | null) => void;
  setSessionRefreshDone: (done: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      auth: null,
      sessionRefreshDone: false,
      setAuth: (auth) => set({ auth }),
      setSessionRefreshDone: (done) => set({ sessionRefreshDone: done }),
      logout: () => set({ auth: null, sessionRefreshDone: false }),
    }),
    {
      name: "chat-net-auth",
      partialize: (state) => ({ auth: state.auth }),
    }
  )
);
