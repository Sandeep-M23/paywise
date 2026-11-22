"use client";

import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo/Logo";

export function LoadingScreen({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "dark bg-sidebar text-foreground fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6",
        className,
      )}
    >
      <Logo className="scale-125" />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="bg-lime animate-loading-bar h-full w-2/5 rounded-full motion-reduce:animate-none" />
      </div>
      <span className="sr-only">Loading Paywise…</span>
    </div>
  );
}

const MAX_MS = 4000;
const IDLE_MS = 600;

export function StartupScreen() {
  const fetching = useIsFetching();
  const started = useRef(false);
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    if (fetching > 0) started.current = true;
    else if (started.current) setPhase((p) => (p === "show" ? "fade" : p));
  }, [fetching]);

  useEffect(() => {
    const idle = setTimeout(() => !started.current && setPhase("fade"), IDLE_MS);
    const max = setTimeout(() => setPhase((p) => (p === "show" ? "fade" : p)), MAX_MS);
    return () => {
      clearTimeout(idle);
      clearTimeout(max);
    };
  }, []);

  useEffect(() => {
    if (phase !== "fade") return;
    const t = setTimeout(() => setPhase("gone"), 300);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <LoadingScreen
      className={cn(
        "transition-opacity duration-300",
        phase === "fade" && "pointer-events-none opacity-0",
      )}
    />
  );
}

export function FetchingBar() {
  const fetching = useIsFetching() > 0;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!fetching) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(t);
  }, [fetching]);
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="bg-lime animate-loading-bar h-full w-1/3 motion-reduce:animate-none" />
    </div>
  );
}
