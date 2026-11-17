import { COUNTRIES, findCountry, formatMoneyParts, type FractionDisplay } from "@paywise/shared";
import { cn } from "@/lib/utils";

/** A large amount with the currency symbol and any fraction quietly dimmed. */
export function HeroMoney({
  amount,
  currency,
  countryCode,
  fraction = "auto",
  className,
}: {
  amount: number;
  currency: string;
  countryCode?: string;
  fraction?: FractionDisplay;
  className?: string;
}) {
  const locale =
    (countryCode
      ? findCountry(countryCode)?.locale
      : COUNTRIES.find((c) => c.currency === currency)?.locale) ?? "en-US";
  const parts = formatMoneyParts(amount, currency, locale, fraction);
  return (
    <span className={cn("font-semibold tracking-tight tabular-nums", className)}>
      {parts.map((part, i) => (
        <span
          key={i}
          className={part.type === "number" ? undefined : "text-muted-foreground font-normal"}
        >
          {part.value}
        </span>
      ))}
    </span>
  );
}
