import { Sigma, Target, Users, Wallet } from "@/components/icons";
import { HeroMoney } from "@/components/shared/HeroMoney/HeroMoney";
import { Stat } from "@/components/shared/StatCard/Stat";
import type { CountryInsights } from "@/hooks/useCountryInsights";

export function CountryStats({
  countries,
  summary,
  currency,
  country,
  short,
}: Pick<CountryInsights, "countries" | "summary" | "currency" | "country" | "short">) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat
        loading={countries.isLoading}
        icon={Users}
        label="Employees"
        value={summary ? summary.headcount.toLocaleString() : "–"}
      />
      <Stat
        loading={countries.isLoading}
        icon={Target}
        label="Median salary"
        hint={summary ? `Range ${short(summary.min)} – ${short(summary.max)}` : undefined}
        value={
          summary ? (
            <HeroMoney
              amount={summary.median}
              currency={currency}
              countryCode={country}
              fraction="none"
            />
          ) : (
            "–"
          )
        }
      />
      <Stat
        loading={countries.isLoading}
        icon={Sigma}
        label="Average salary"
        value={
          summary ? (
            <HeroMoney
              amount={summary.mean}
              currency={currency}
              countryCode={country}
              fraction="none"
            />
          ) : (
            "–"
          )
        }
        hint={
          summary && summary.mean > summary.median
            ? "Above the median: a few high earners pull the average up."
            : undefined
        }
      />
      <Stat
        loading={countries.isLoading}
        icon={Wallet}
        label="Annual payroll"
        value={
          summary ? (
            <HeroMoney
              amount={summary.total}
              currency={currency}
              countryCode={country}
              fraction="none"
            />
          ) : (
            "–"
          )
        }
      />
    </div>
  );
}
