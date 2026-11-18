"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/auth/login", {
        method: "POST",
        json: { email: form.get("email"), password: form.get("password") },
      });
      // Only allow same-site relative paths, never an open redirect.
      const next = searchParams.get("next");
      window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign in. Try again.");
      setPending(false);
    }
  }

  // Maglo's sign-in: no card, a large greeting, tall inputs and a full-width lime button.
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="text-muted-foreground mt-2 mb-8 text-sm">
        Salary data is confidential. HR access only.
      </p>
      <div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              className="h-12"
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              className="h-12"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" size="lg" className="mt-2 h-12" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
