import { currencyExponent, findCountry, formatMoney } from "@paywise/shared";

/** Money in the conventions of the country it is paid in (₹18,00,000.00, €65.000,00). */
export function money(amount: number, currency: string, countryCode?: string) {
  const locale = countryCode ? findCountry(countryCode)?.locale : undefined;
  return formatMoney(amount, currency, locale ?? "en-US");
}

/** Compact money for chart axes and dense tables ($113K, ₹28.7L style via Intl). */
export function compactMoney(amount: number, currency: string, countryCode?: string) {
  const locale = (countryCode && findCountry(countryCode)?.locale) || "en-US";
  return new Intl.NumberFormat(locale, {
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
