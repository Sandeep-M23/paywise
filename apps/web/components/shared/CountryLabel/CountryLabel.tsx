import { countryName } from "@/utils/helpers/others/format";

/*
 * Small visual vocabulary reused across tables and cards: country flags,
 * department icons and initials avatars. Icons always sit next to text, so
 * nothing is conveyed by the icon alone.
 */

const FLAGS: Record<string, string> = {
  US: "🇺🇸",
  IN: "🇮🇳",
  DE: "🇩🇪",
  GB: "🇬🇧",
  JP: "🇯🇵",
  CA: "🇨🇦",
  AU: "🇦🇺",
  SG: "🇸🇬",
};

export const countryFlag = (code: string) => FLAGS[code] ?? "🏳️";

export function CountryLabel({ code, short = false }: { code: string; short?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="text-base leading-none">
        {FLAGS[code] ?? "🏳️"}
      </span>
      {short ? code : countryName(code)}
    </span>
  );
}
