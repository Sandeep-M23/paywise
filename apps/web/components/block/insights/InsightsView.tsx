"use client";

import { useCountryInsights } from "@/hooks/useCountryInsights";
import { BreakdownCard } from "./BreakdownCard";
import { CountryStats } from "./CountryStats";
import { CountryTabs } from "./CountryTabs";
import { DistributionCard } from "./DistributionCard";
import { PayBandsCard } from "./PayBandsCard";

export function InsightsView() {
  const insights = useCountryInsights();

  return (
    <>
      <CountryTabs {...insights} />
      <CountryStats {...insights} />
      <div className="grid gap-4 xl:grid-cols-2">
        <PayBandsCard {...insights} />
        <DistributionCard {...insights} />
      </div>
      <BreakdownCard {...insights} />
    </>
  );
}
