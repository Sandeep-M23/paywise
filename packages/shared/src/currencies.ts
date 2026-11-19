import { COUNTRIES } from "./countries";

/**
 * Currencies pay can be denominated in: every country's default, plus BHD and KWD
 * (three decimals) for overrides. Lowercase ISO 4217, as stored. Each currency's
 * number of decimals comes from money.ts (`currencyExponent`).
 */
export const CURRENCIES = [
  { code: "usd", name: "US dollar" },
  { code: "inr", name: "Indian rupee" },
  { code: "eur", name: "Euro" },
  { code: "gbp", name: "Pound sterling" },
  { code: "jpy", name: "Japanese yen" },
  { code: "cad", name: "Canadian dollar" },
  { code: "aud", name: "Australian dollar" },
  { code: "sgd", name: "Singapore dollar" },
  { code: "bhd", name: "Bahraini dinar" },
  { code: "kwd", name: "Kuwaiti dinar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [CurrencyCode, ...CurrencyCode[]];

const supported = new Set<string>(CURRENCY_CODES);

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return supported.has(code.toLowerCase());
}

// Every country's default must be a supported currency.
for (const country of COUNTRIES) {
  if (!supported.has(country.currency)) {
    throw new Error(`Country ${country.code} defaults to unsupported ${country.currency}`);
  }
}
