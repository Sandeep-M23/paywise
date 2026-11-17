/**
 * Money is stored the way Stripe stores it: an integer amount in the currency's
 * smallest unit plus a lowercase ISO 4217 code. This module is the only place
 * that converts between user input, minor units and display strings.
 */

export type Money = { amount: number; currency: string };

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

// Stripe's zero- and three-decimal lists; everything else has two.
const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);
const THREE_DECIMAL = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

export function currencyExponent(currency: string): number {
  const code = currency.toLowerCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

const WESTERN_GROUPING = /^\d{1,3}(,\d{3})+$/;
// Lakh/crore: last group of three, earlier groups of two (12,34,56,789).
const INDIAN_GROUPING = /^\d{1,2}(,\d{2})*,\d{3}$/;
const LEADING_SYMBOL_OR_CODE = /^(?:[A-Za-z]{3}|[^\d\s.,-])\s*/;

const fail = (error: string): ParseResult => ({ ok: false, error });

/**
 * Parses a human-entered amount ("₹12,00,000.00", "USD 85,000", "1500.125")
 * into minor units without ever going through a float.
 */
export function parseMoneyInput(input: string, currency: string): ParseResult {
  const code = currency.toUpperCase();
  const text = input.trim().replace(LEADING_SYMBOL_OR_CODE, "").trim();

  if (text === "") return fail("Amount is required");
  if (text.startsWith("-")) return fail("Amount cannot be negative");
  if (text.includes(".") && text.includes(",") && text.lastIndexOf(",") > text.indexOf(".")) {
    return fail("Use '.' for decimals and ',' only to group thousands");
  }

  const [integerPart = "", fractionPart = "", ...rest] = text.split(".");
  if (rest.length > 0) return fail("Amount has more than one decimal point");

  if (integerPart.includes(",")) {
    if (!WESTERN_GROUPING.test(integerPart) && !INDIAN_GROUPING.test(integerPart)) {
      return fail("Use '.' for decimals and ',' only to group thousands");
    }
  }
  const digits = integerPart.replaceAll(",", "");
  if (!/^\d+$/.test(digits) || !/^\d*$/.test(fractionPart)) {
    return fail("Amount must be a number, e.g. 85000.00");
  }

  const exponent = currencyExponent(currency);
  // Excel often writes trailing zeros (9000000.00 for JPY); those are harmless.
  const significantFraction = fractionPart.replace(/0+$/, "");
  if (significantFraction.length > exponent) {
    return fail(
      exponent === 0
        ? `${code} has no decimal places`
        : `${code} allows at most ${exponent} decimal places`,
    );
  }

  const minor = BigInt(digits + significantFraction.padEnd(exponent, "0"));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return fail("Amount is too large");
  return { ok: true, value: Number(minor) };
}

/** Plain decimal string without grouping, e.g. for form fields and CSV cells. */
export function toMajorString(amount: number, currency: string): string {
  const exponent = currencyExponent(currency);
  if (exponent === 0) return String(amount);
  const padded = String(amount).padStart(exponent + 1, "0");
  return `${padded.slice(0, -exponent)}.${padded.slice(-exponent)}`;
}

export function formatMoney(amount: number, currency: string, locale = "en-US"): string {
  const exponent = currencyExponent(currency);
  // Dividing to a float is fine here: this is display only, never stored or summed.
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(amount / 10 ** exponent);
}
