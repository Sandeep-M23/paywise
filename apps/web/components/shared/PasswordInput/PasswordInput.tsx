"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A password input with an eye button that shows or hides what was typed. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md outline-none focus-visible:ring-2"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
