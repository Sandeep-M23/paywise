"use client";

import { countryFlag } from "@/components/shared/CountryLabel/CountryLabel";
import { Skeleton } from "@/components/ui/skeleton";
import type { CountryInsights } from "@/hooks/useCountryInsights";
import { cn } from "@/lib/utils";
import { countryName } from "@/utils/helpers/others/format";

const SHORT_NAMES: Record<string, string> = { US: "USA", GB: "UK" };

export function CountryTabs({
  countries,
  country,
  setCountry,
}: Pick<CountryInsights, "countries" | "country" | "setCountry">) {
  return (
    <div
      role="tablist"
      aria-label="Country"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8"
    >
      {countries.isLoading &&
        Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[3.75rem] rounded-xl" />
        ))}
      {[...(countries.data ?? [])]
        .sort((a, b) => b.headcount - a.headcount)
        .map((c) => {
          const active = c.countryCode === country;
          return (
            <button
              key={c.countryCode}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCountry(c.countryCode)}
              className={cn(
                "ring-border flex min-w-0 flex-col gap-1 rounded-xl px-3 py-2.5 text-left ring-1 transition-colors",
                active
                  ? "dark bg-sidebar text-foreground ring-sidebar"
                  : "bg-card hover:ring-foreground/30",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="text-lg leading-none">
                  {countryFlag(c.countryCode)}
                </span>
                <span className="truncate text-sm font-semibold" title={countryName(c.countryCode)}>
                  {SHORT_NAMES[c.countryCode] ?? countryName(c.countryCode)}
                </span>
              </span>
              <span
                className={cn(
                  "truncate text-xs tabular-nums",
                  active ? "text-lime font-semibold" : "text-muted-foreground",
                )}
              >
                {c.headcount.toLocaleString()} people
              </span>
            </button>
          );
        })}
    </div>
  );
}
