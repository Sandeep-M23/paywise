import { describe, expect, it } from "vitest";
import {
  currencyExponent,
  formatMoney,
  formatMoneyParts,
  parseMoneyInput,
  toMajorString,
} from "./money";

describe("currencyExponent", () => {
  it("defaults to 2 decimal places", () => {
    expect(currencyExponent("usd")).toBe(2);
    expect(currencyExponent("inr")).toBe(2);
  });

  it("knows zero-decimal currencies", () => {
    expect(currencyExponent("jpy")).toBe(0);
    expect(currencyExponent("krw")).toBe(0);
  });

  it("knows three-decimal currencies", () => {
    expect(currencyExponent("kwd")).toBe(3);
    expect(currencyExponent("bhd")).toBe(3);
  });

  it("is case-insensitive", () => {
    expect(currencyExponent("JPY")).toBe(0);
  });
});

describe("parseMoneyInput", () => {
  const ok = (value: number) => ({ ok: true, value });

  it("parses plain numbers into minor units", () => {
    expect(parseMoneyInput("85000", "usd")).toEqual(ok(8_500_000));
    expect(parseMoneyInput("85000.5", "usd")).toEqual(ok(8_500_050));
    expect(parseMoneyInput("85000.55", "usd")).toEqual(ok(8_500_055));
  });

  it("avoids floating point errors", () => {
    // parseFloat("0.29") * 100 === 28.999999999999996
    expect(parseMoneyInput("0.29", "usd")).toEqual(ok(29));
    expect(parseMoneyInput("1.15", "usd")).toEqual(ok(115));
  });

  it("accepts western thousands grouping", () => {
    expect(parseMoneyInput("1,200,000.00", "usd")).toEqual(ok(120_000_000));
  });

  it("accepts indian lakh/crore grouping", () => {
    expect(parseMoneyInput("12,00,000", "inr")).toEqual(ok(120_000_000));
    expect(parseMoneyInput("1,20,00,000.50", "inr")).toEqual(ok(1_200_000_050));
  });

  it("strips currency symbols, codes and surrounding whitespace", () => {
    expect(parseMoneyInput("  ₹12,00,000.00 ", "inr")).toEqual(ok(120_000_000));
    expect(parseMoneyInput("$85,000", "usd")).toEqual(ok(8_500_000));
    expect(parseMoneyInput("USD 85,000", "usd")).toEqual(ok(8_500_000));
    expect(parseMoneyInput("€ 60000", "eur")).toEqual(ok(6_000_000));
  });

  it("handles zero-decimal currencies", () => {
    expect(parseMoneyInput("¥9,000,000", "jpy")).toEqual(ok(9_000_000));
    expect(parseMoneyInput("9000000.00", "jpy")).toEqual(ok(9_000_000));
  });

  it("handles three-decimal currencies", () => {
    expect(parseMoneyInput("1500.125", "kwd")).toEqual(ok(1_500_125));
  });

  it("rejects more decimals than the currency allows", () => {
    expect(parseMoneyInput("100.505", "usd")).toMatchObject({ ok: false });
    expect(parseMoneyInput("9000000.50", "jpy")).toMatchObject({ ok: false });
  });

  it("rejects ambiguous european formatting", () => {
    expect(parseMoneyInput("12.000,50", "eur")).toMatchObject({ ok: false });
    expect(parseMoneyInput("12,5", "eur")).toMatchObject({ ok: false });
  });

  it("rejects malformed grouping", () => {
    expect(parseMoneyInput("12,0,00", "inr")).toMatchObject({ ok: false });
    expect(parseMoneyInput("1,2345", "usd")).toMatchObject({ ok: false });
  });

  it("rejects empty, negative and non-numeric input", () => {
    expect(parseMoneyInput("", "usd")).toMatchObject({ ok: false });
    expect(parseMoneyInput("   ", "usd")).toMatchObject({ ok: false });
    expect(parseMoneyInput("-500", "usd")).toMatchObject({ ok: false });
    expect(parseMoneyInput("twelve lakh", "inr")).toMatchObject({ ok: false });
    expect(parseMoneyInput("1e6", "usd")).toMatchObject({ ok: false });
  });

  it("rejects amounts beyond safe integer precision", () => {
    expect(parseMoneyInput("99999999999999999", "usd")).toMatchObject({ ok: false });
  });

  it("explains why input was rejected", () => {
    const result = parseMoneyInput("9000000.50", "jpy");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/JPY/);
  });
});

describe("toMajorString", () => {
  it("renders minor units as a plain decimal string", () => {
    expect(toMajorString(8_500_050, "usd")).toBe("85000.50");
    expect(toMajorString(9_000_000, "jpy")).toBe("9000000");
    expect(toMajorString(1_500_125, "kwd")).toBe("1500.125");
    expect(toMajorString(5, "usd")).toBe("0.05");
  });

  it("round-trips with parseMoneyInput", () => {
    for (const [amount, currency] of [
      [8_500_050, "usd"],
      [120_000_000, "inr"],
      [9_000_000, "jpy"],
      [7, "kwd"],
    ] as const) {
      expect(parseMoneyInput(toMajorString(amount, currency), currency)).toEqual({
        ok: true,
        value: amount,
      });
    }
  });
});

describe("formatMoney", () => {
  it("formats for display with the currency symbol", () => {
    expect(formatMoney(8_500_000, "usd", "en-US")).toBe("$85,000.00");
    expect(formatMoney(9_000_000, "jpy", "en-US")).toBe("¥9,000,000");
  });

  it("can hide a zero fraction, or round to whole units for aggregates", () => {
    expect(formatMoney(180_000_000, "inr", "en-IN", "auto")).toBe("₹18,00,000");
    expect(formatMoney(8_500_050, "usd", "en-US", "auto")).toBe("$85,000.50");
    expect(formatMoney(294_563_242, "inr", "en-IN", "none")).toBe("₹29,45,632");
    expect(formatMoney(9_000_000, "jpy", "en-US", "none")).toBe("¥9,000,000");
  });

  it("uses locale grouping", () => {
    expect(formatMoney(180_000_000, "inr", "en-IN")).toBe("₹18,00,000.00");
  });
});

describe("formatMoneyParts", () => {
  it("splits symbol, number and fraction and joins back to formatMoney", () => {
    const parts = formatMoneyParts(8_500_050, "usd", "en-US");
    expect(parts.map((p) => p.value).join("")).toBe(formatMoney(8_500_050, "usd", "en-US"));
    expect(parts.filter((p) => p.type === "currency").map((p) => p.value)).toEqual(["$"]);
    expect(
      parts
        .filter((p) => p.type === "fraction")
        .map((p) => p.value)
        .join(""),
    ).toBe(".50");
  });
});
