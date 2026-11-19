"use client";

import { api } from "@/utils/services";
import { useQuery } from "@tanstack/react-query";

export async function signOut() {
  await api("/auth/logout", { method: "POST" }).catch(() => undefined);
  window.location.assign("/login");
}

export function useAccount() {
  const { data } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ email: string }>("/auth/me"),
    staleTime: Infinity,
  });
  const email = data?.email ?? "";
  const local = email.split("@")[0] || "hr";
  // Short handles are usually initials or a team ("hr"): show them in capitals.
  const name = local.length <= 3 ? local.toUpperCase() : local;
  return { email, name };
}
