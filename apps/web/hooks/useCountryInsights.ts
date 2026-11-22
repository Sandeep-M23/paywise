"use client";

import { useAtom } from "jotai";
import { currencyForCountry, type CountryCode } from "@paywise/shared";
import {
  useCountrySummaries,
  useDepartmentSummaries,
  useDistribution,
  useJobTitleSummaries,
} from "@/utils/apis/insights";
import { insightsCountryAtom } from "@/utils/atoms/insights";
import { compactMoney, money } from "@/utils/helpers/others/format";

export function useCountryInsights() {
  const [country, setCountry] = useAtom(insightsCountryAtom);
  const currency = currencyForCountry(country as CountryCode);
  const countries = useCountrySummaries();
  const titles = useJobTitleSummaries(country);
  const departments = useDepartmentSummaries(country);
  const distribution = useDistribution(country);
  const summary = countries.data?.find((c) => c.countryCode === country);
  const fmt = (amount: number) => money(amount, currency, country, "none");
  const short = (amount: number) => compactMoney(amount, currency, country);

  return {
    country,
    setCountry,
    currency,
    countries,
    titles,
    departments,
    distribution,
    summary,
    fmt,
    short,
  };
}

export type CountryInsights = ReturnType<typeof useCountryInsights>;
