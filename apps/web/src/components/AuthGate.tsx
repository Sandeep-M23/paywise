"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/lib/auth-client";
import { decodeAuthToken } from "@/lib/jwt";

/**
 * Shows the app only to a signed-in user; anyone else goes to /login with a
 * `next` link back. The API checks the token on every request regardless.
 * The page is always rendered, just hidden, so Next.js can still pre-render
 * the segment (returning null would drop it from instant navigation).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // `isAuthenticated` reads false for one tick during hydration, so check the
    // stored token directly before redirecting. decodeAuthToken is expiry-aware:
    // an expired token is still stored, and must not count as signed in.
    if (!isAuthenticated && !decodeAuthToken(getAuthToken() ?? "")) {
      // Read in the effect, not with useSearchParams, so the layout needs no Suspense.
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // Full load, for the same reason as AuthContext.logout.
      window.location.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated]);

  return (
    <div hidden={!isAuthenticated} className="contents">
      {children}
    </div>
  );
}
