import { describe, expect, it } from "vitest";
import { COUNTRIES } from "./countries";
import { CURRENCY_CODES, isSupportedCurrency } from "./currencies";
import { currencyExponent, formatMoney, parseMoneyInput, toMajorString } from "./money";
import { currencySchema } from "./schemas";

describe("supported currencies", () => {
  it("include every country's default and the three-decimal overrides", () => {
    for (const country of COUNTRIES) expect(CURRENCY_CODES).toContain(country.currency);
    expect(CURRENCY_CODES).toEqual(expect.arrayContaining(["bhd", "kwd"]));
  });

  it("have the right number of decimals", () => {
    expect(currencyExponent("jpy")).toBe(0);
    expect(currencyExponent("usd")).toBe(2);
    expect(currencyExponent("bhd")).toBe(3);
    expect(currencyExponent("kwd")).toBe(3);
  });

  it("round-trip three-decimal amounts exactly", () => {
    const parsed = parseMoneyInput("12,000.500", "bhd");
    expect(parsed).toEqual({ ok: true, value: 12_000_500 });
    expect(toMajorString(12_000_500, "bhd")).toBe("12000.500");
    expect(formatMoney(12_000_500, "bhd", "en-US")).toContain("12,000.500");
  });

  it("validate as lowercase ISO 4217, case-insensitively", () => {
    expect(currencySchema.parse("USD")).toBe("usd");
    expect(currencySchema.safeParse("xyz").success).toBe(false);
    expect(isSupportedCurrency("KWD")).toBe(true);
    expect(isSupportedCurrency("btc")).toBe(false);
  });
});
