"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthContextType } from "@/@types";
import { PATH } from "@/utils/constants/others/paths";
import { clearAuthToken, getAuthToken, saveAuthToken } from "@/utils/helpers/others/cookies";
import { decodeAuthToken } from "@/utils/helpers/others/jwt";

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
  const token = useSyncExternalStore(subscribe, getAuthToken, getServerSnapshot);
  const decoded = token ? decodeAuthToken(token) : null;
  const user = decoded ? { email: decoded.email } : null;

  function login(newToken: string) {
    saveAuthToken(newToken);
  }

  function logout() {
    clearAuthToken();
    queryClient.clear();
    window.location.assign(PATH.LOGIN);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAccount() {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const local = email.split("@")[0] || "hr";
  const name = local.length <= 3 ? local.toUpperCase() : local;
  return { email, name };
}
