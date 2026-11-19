"use client";

import { Field } from "@/components/FormField";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { loginRequest } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@paywise/shared";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // Stays true after success, so the button doesn't re-enable while the app loads.
  const [redirecting, setRedirecting] = useState(false);

  const { register, handleSubmit, setError, formState } = useForm<
    z.input<typeof loginSchema>,
    unknown,
    LoginInput
  >({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    const result = await loginRequest(values);

    if (!result.ok) {
      setError("root", { message: result.message });
      return;
    }

    setRedirecting(true);
    login(result.data.authToken);
    // Only same-site paths: `next` comes from the URL, so it must not send anyone off-site.
    const next = searchParams.get("next");
    // A full page load, not router.replace: a client-side switch from /login into
    // the app shows the route loader and then the startup splash (two splashes).
    window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
  });

  const pending = isSubmitting || redirecting;

  // Maglo's sign-in: no card, a large greeting, tall inputs and a full-width lime button.
  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome to Paywise</h1>
      <p className="text-muted-foreground mt-2 mb-8 text-sm">
        Sign in to manage employee compensation and salary insights.
      </p>
      <div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <Field id="email" label="Email" error={errors.email?.message}>
            <Input
              className="h-12"
              id="email"
              type="email"
              autoComplete="username"
              {...register("email")}
            />
          </Field>
          <Field id="password" label="Password" error={errors.password?.message}>
            <Input
              className="h-12"
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </Field>
          <Button type="submit" size="lg" className="mt-2 h-12" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
