import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse } from "@chatnet/shared";

interface AuthState {
  auth: AuthResponse | null;
  setAuth: (auth: AuthResponse | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      auth: null,
      setAuth: (auth) => set({ auth }),
    }),
    { name: "chatnet-auth" }
  )
);
