"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/lib/auth-client";
import { decodeAuthToken } from "@/lib/jwt";

/**
 * Renders the app only for a signed-in user; anyone else goes to /login with a
 * `next` link back. The API checks the token on every request regardless.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // `isAuthenticated` reads false for one tick during hydration, so check the
    // stored token directly before redirecting. decodeAuthToken is expiry-aware:
    // an expired token is still stored, and must not count as signed in.
    if (!isAuthenticated && !decodeAuthToken(getAuthToken() ?? "")) {
      const query = searchParams.toString();
      const next = encodeURIComponent(pathname + (query ? `?${query}` : ""));
      router.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated, pathname, router, searchParams]);

  if (!isAuthenticated) return null;
  return children;
}
