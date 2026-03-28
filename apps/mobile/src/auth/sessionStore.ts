import { create } from "zustand";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "locked";

type SessionStore = {
  status: AuthStatus;
  message: string;
  deviceId: string | null;
  setStateSnapshot: (next: { status: AuthStatus; message: string; deviceId?: string | null }) => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  status: "loading",
  message: "Initializing secure session...",
  deviceId: null,
  setStateSnapshot: (next) =>
    set({
      status: next.status,
      message: next.message,
      deviceId: next.deviceId ?? null,
    }),
}));

