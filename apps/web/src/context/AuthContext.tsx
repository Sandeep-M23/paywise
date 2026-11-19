"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearAuthToken, getAuthToken, saveAuthToken } from "@/lib/auth-client";
import { decodeAuthToken, type AuthUser } from "@/lib/jwt";

const AUTH_CHANGE_EVENT = "paywise-auth-change";

function subscribe(callback: () => void) {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  // Another tab signing in or out changes localStorage here too.
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerSnapshot() {
  return null;
}

export function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // useSyncExternalStore handles hydration itself: it renders the server
  // snapshot (null) first, then re-renders with the real localStorage value.
  const token = useSyncExternalStore(subscribe, getAuthToken, getServerSnapshot);
  const user = token ? decodeAuthToken(token) : null;

  function login(newToken: string) {
    saveAuthToken(newToken);
    notifyAuthChange();
  }

  function logout() {
    clearAuthToken();
    queryClient.clear();
    // A full page load, not a client-side switch: it drops every salary held in
    // memory, and Next.js would otherwise restore the sign-in form exactly as it
    // was left (email and password filled in, button stuck on "Signing in…").
    window.location.assign("/login");
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** The signed-in account for display: "HR" for short handles, else the local part. */
export function useAccount() {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const local = email.split("@")[0] || "hr";
  // Short handles are usually initials or a team ("hr"): show them in capitals.
  const name = local.length <= 3 ? local.toUpperCase() : local;
  return { email, name };
}
