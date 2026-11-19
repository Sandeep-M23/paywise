"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthContextType } from "@/@types";
import { PATH } from "@/utils/constants/others/paths";
import { clearAuthToken, getAuthToken, saveAuthToken } from "@/utils/helpers/others/cookies";
import { decodeAuthToken } from "@/utils/helpers/others/jwt";

// Sign-in and sign-out are full page loads, so the cookie never changes under a
// mounted page; there is nothing to subscribe to.
const subscribe = () => () => {};
const getServerSnapshot = () => null;

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider: React.FC<TChildren> = ({ children }) => {
  const queryClient = useQueryClient();
  // The server renders without the cookie (null); the client reads it on hydration.
  const token = useSyncExternalStore(subscribe, getAuthToken, getServerSnapshot);
  const decoded = token ? decodeAuthToken(token) : null;
  const user = decoded ? { email: decoded.email } : null;

  function login(newToken: string) {
    saveAuthToken(newToken);
  }

  function logout() {
    clearAuthToken();
    queryClient.clear();
    // A full page load, not a client-side switch: it drops every salary held in
    // memory, and Next.js would otherwise restore the sign-in form exactly as it
    // was left (email and password filled in, button stuck on "Signing in…").
    window.location.assign(PATH.LOGIN);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/** The signed-in account for display: "HR" for short handles, else the local part. */
export function useAccount() {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const local = email.split("@")[0] || "hr";
  // Short handles are usually initials or a team ("hr"): show them in capitals.
  const name = local.length <= 3 ? local.toUpperCase() : local;
  return { email, name };
}
