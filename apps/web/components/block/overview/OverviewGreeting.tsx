"use client";

import { useClientNow } from "@/hooks/useClientNow";

function greeting(now: Date | null) {
  if (!now) return "Welcome";
  const hour = now.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function OverviewGreeting() {
  const now = useClientNow();
  return (
    <section>
      <div>
        <p className="text-muted-foreground h-5 text-sm">
          {now?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {greeting(now)}, <span className="text-muted-foreground">HR team</span>
        </h2>
      </div>
    </section>
  );
}
