"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { loginRequest } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await loginRequest({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    login(result.data.authToken);
    // Only same-site paths: `next` comes from the URL, so it must not send anyone off-site.
    const next = searchParams.get("next");
    // A full page load, not router.replace: a client-side switch from /login into
    // the app shows the route loader and then the startup splash (two splashes).
    window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
  }

  // Maglo's sign-in: no card, a large greeting, tall inputs and a full-width lime button.
  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome to Paywise</h1>
      <p className="text-muted-foreground mt-2 mb-8 text-sm">
        Sign in to manage employee compensation and salary insights.
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
