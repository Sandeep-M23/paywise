"use client";

import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Shared/Logo/Logo";

/** The branded full-screen loader: logo on black with a sweeping lime bar. */
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

// Longest the splash may stay up, so a slow request never blocks the whole app.
const MAX_MS = 4000;
// If nothing starts loading within this time, there is nothing to wait for.
const IDLE_MS = 600;

/**
 * Covers the app on first load until the page's first data has arrived, then
 * fades out. It is rendered on the server too, so the empty shell never flashes.
 * It shows once per full page load: the shell layout stays mounted while you navigate.
 */
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

/**
 * After start-up, background loads (filters, sorting, refreshes) show as a thin lime
 * bar along the top of the page. It waits a moment so quick loads don't flicker.
 */
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
