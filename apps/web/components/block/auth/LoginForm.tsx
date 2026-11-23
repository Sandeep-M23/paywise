"use client";

import { Field } from "@/components/shared/FormField/FormField";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/PasswordInput/PasswordInput";
import { useAuth } from "@/context/auth";
import { handleLogin } from "@/utils/apis/auth";
import { safeRedirectPath } from "@/utils/helpers/others/redirect";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@paywise/shared";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { login } = useAuth();

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
    const result = await handleLogin(values);

    if (!result.ok) {
      setError("root", { message: result.message });
      return;
    }

    setRedirecting(true);
    login(result.data.authToken);
    window.location.assign(safeRedirectPath(searchParams.get("next"), window.location.origin));
  });

  const pending = isSubmitting || redirecting;

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
              placeholder="you@company.com"
              {...register("email")}
            />
          </Field>
          <Field id="password" label="Password" error={errors.password?.message}>
            <PasswordInput
              className="h-12"
              id="password"
              autoComplete="current-password"
              placeholder="Enter your password"
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
