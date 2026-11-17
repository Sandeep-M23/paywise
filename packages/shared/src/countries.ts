// Supported countries. Currency is always derived from here, never entered by a user.
export const COUNTRIES = [
  { code: "US", name: "United States", currency: "usd", locale: "en-US" },
  { code: "IN", name: "India", currency: "inr", locale: "en-IN" },
  { code: "DE", name: "Germany", currency: "eur", locale: "de-DE" },
  { code: "GB", name: "United Kingdom", currency: "gbp", locale: "en-GB" },
  { code: "JP", name: "Japan", currency: "jpy", locale: "ja-JP" },
  { code: "CA", name: "Canada", currency: "cad", locale: "en-CA" },
  { code: "AU", name: "Australia", currency: "aud", locale: "en-AU" },
  { code: "SG", name: "Singapore", currency: "sgd", locale: "en-SG" },
] as const;

export type Country = (typeof COUNTRIES)[number];
export type CountryCode = Country["code"];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]];

const byCode = new Map<string, Country>(COUNTRIES.map((c) => [c.code, c]));

export function findCountry(code: string): Country | undefined {
  return byCode.get(code.toUpperCase());
}

export function currencyForCountry(code: CountryCode): Country["currency"] {
  return byCode.get(code)!.currency;
}
