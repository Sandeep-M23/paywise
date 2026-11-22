import {
  COUNTRIES,
  currencyExponent,
  findCountry,
  formatMoney,
  type FractionDisplay,
} from "@paywise/shared";

export function money(
  amount: number,
  currency: string,
  countryCode?: string,
  fraction: FractionDisplay = "auto",
) {
  const locale = countryCode
    ? findCountry(countryCode)?.locale
    : COUNTRIES.find((c) => c.currency === currency.toLowerCase())?.locale;
  return formatMoney(amount, currency, locale ?? "en-US", fraction);
}

export function compactMoney(amount: number, currency: string, _countryCode?: string) {
  return new Intl.NumberFormat(currency.toLowerCase() === "inr" ? "en-IN" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount / 10 ** currencyExponent(currency));
}

export function percent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function date(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export const humanize = (value: string) =>
  value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

export function countryName(code: string) {
  return findCountry(code)?.name ?? code;
}
