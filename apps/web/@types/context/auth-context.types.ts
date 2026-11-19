import type { AuthUser } from "../api/auth.types";

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}
