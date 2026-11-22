import { Faker, base, de, en, en_IN } from "@faker-js/faker";
import {
  currencyExponent,
  currencyForCountry,
  type CountryCode,
  type EmployeeCreateInput,
  type EmploymentType,
  type Gender,
} from "@paywise/shared";

export type SeedRevision = {
  amount: number;
  effectiveOn: string;
  reason: "hire" | "merit" | "promotion" | "market_adjustment";
};

export type SeedEmployee = {
  employee: EmployeeCreateInput;
  history: SeedRevision[];
  deactivationReason?: string;
};

type Role = { title: string; department: string; usdMedian: number; weight: number };

const ROLES: Role[] = [
  { title: "Software Engineer", department: "Engineering", usdMedian: 120_000, weight: 18 },
  { title: "Senior Software Engineer", department: "Engineering", usdMedian: 160_000, weight: 10 },
  { title: "Staff Engineer", department: "Engineering", usdMedian: 210_000, weight: 2 },
  { title: "Engineering Manager", department: "Engineering", usdMedian: 190_000, weight: 3 },
  { title: "QA Engineer", department: "Engineering", usdMedian: 95_000, weight: 5 },
  { title: "DevOps Engineer", department: "Engineering", usdMedian: 130_000, weight: 4 },
  { title: "Product Manager", department: "Product", usdMedian: 140_000, weight: 4 },
  { title: "Senior Product Manager", department: "Product", usdMedian: 175_000, weight: 2 },
  { title: "Product Designer", department: "Design", usdMedian: 115_000, weight: 4 },
  { title: "Data Analyst", department: "Data", usdMedian: 90_000, weight: 4 },
  { title: "Data Scientist", department: "Data", usdMedian: 135_000, weight: 3 },
  { title: "Account Executive", department: "Sales", usdMedian: 95_000, weight: 7 },
  { title: "Sales Development Rep", department: "Sales", usdMedian: 60_000, weight: 6 },
  { title: "Marketing Manager", department: "Marketing", usdMedian: 105_000, weight: 4 },
  { title: "Support Specialist", department: "Customer Success", usdMedian: 55_000, weight: 8 },
  {
    title: "Customer Success Manager",
    department: "Customer Success",
    usdMedian: 80_000,
    weight: 5,
  },
  { title: "Financial Analyst", department: "Finance", usdMedian: 85_000, weight: 3 },
  { title: "HR Business Partner", department: "People", usdMedian: 90_000, weight: 2 },
  { title: "Recruiter", department: "People", usdMedian: 75_000, weight: 3 },
  { title: "Operations Manager", department: "Operations", usdMedian: 95_000, weight: 3 },
];

const MARKETS: Record<
  CountryCode,
  { weight: number; perUsd: number; step: number; names: "en" | "in" | "de" | "jp" }
> = {
  US: { weight: 25, perUsd: 1, step: 1_000, names: "en" },
  IN: { weight: 30, perUsd: 25, step: 10_000, names: "in" },
  GB: { weight: 10, perUsd: 0.62, step: 1_000, names: "en" },
  DE: { weight: 10, perUsd: 0.68, step: 1_000, names: "de" },
  CA: { weight: 7, perUsd: 0.95, step: 1_000, names: "en" },
  AU: { weight: 6, perUsd: 1.05, step: 1_000, names: "en" },
  SG: { weight: 5, perUsd: 0.95, step: 1_000, names: "en" },
  JP: { weight: 7, perUsd: 95, step: 10_000, names: "jp" },
};

const JP_FIRST = {
  female: ["Yui", "Aoi", "Hina", "Sakura", "Yuna", "Mio", "Rin", "Haruka", "Akari", "Emi"],
  male: ["Haruto", "Ren", "Sota", "Yuto", "Kenji", "Takumi", "Riku", "Daiki", "Kaito", "Hiroshi"],
};
const JP_LAST = [
  "Sato",
  "Suzuki",
  "Takahashi",
  "Tanaka",
  "Watanabe",
  "Ito",
  "Yamamoto",
  "Nakamura",
  "Kobayashi",
  "Kato",
];

const GENDERS: [Gender, number][] = [
  ["female", 42],
  ["male", 54],
  ["non_binary", 2],
  ["undisclosed", 2],
];
const EMPLOYMENT: [EmploymentType, number][] = [
  ["full_time", 88],
  ["part_time", 5],
  ["contract", 7],
];

const FIRST_HIRE = "2012-01-01";
const DAY_MS = 86_400_000;

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const monthsBefore = (iso: string, months: number) => {
  const date = new Date(toDate(iso));
  date.setUTCMonth(date.getUTCMonth() - months);
  return toIso(date.getTime());
};
const slug = (value: string) => value.normalize("NFKD").replace(/[^\w]/g, "").toLowerCase();

export function generateEmployees({
  count,
  seed,
  today,
}: {
  count: number;
  seed: number;
  today: string;
}): SeedEmployee[] {
  const rng = new Faker({ locale: [base] });
  const names = {
    en: new Faker({ locale: [en, base] }),
    in: new Faker({ locale: [en_IN, en, base] }),
    de: new Faker({ locale: [de, en, base] }),
  };
  rng.seed(seed);
  names.en.seed(seed + 1);
  names.in.seed(seed + 2);
  names.de.seed(seed + 3);

  const weighted = <T>(entries: [T, number][]) =>
    rng.helpers.weightedArrayElement(entries.map(([value, weight]) => ({ value, weight })));
  const countries = Object.entries(MARKETS).map(
    ([code, m]) => [code as CountryCode, m.weight] as [CountryCode, number],
  );
  const roles = ROLES.map((r) => [r, r.weight] as [Role, number]);
  const latestHire = toDate(today) - 30 * DAY_MS;

  const people: SeedEmployee[] = [];
  for (let i = 1; i <= count; i++) {
    const countryCode = weighted(countries);
    const market = MARKETS[countryCode];
    const role = weighted(roles);
    const gender = weighted(GENDERS);
    const employmentType = weighted(EMPLOYMENT);

    const hireMs =
      toDate(FIRST_HIRE) + Math.sqrt(rng.number.float()) * (latestHire - toDate(FIRST_HIRE));
    const hireDate = toIso(hireMs);
    const tenureYears = (toDate(today) - hireMs) / (365 * DAY_MS);

    let factor = Math.exp(rng.number.float({ min: -0.12, max: 0.12 }));
    factor *= 1 + Math.min(tenureYears * 0.015, 0.15);
    if (employmentType === "part_time") factor *= 0.6;

    if (countryCode === "DE" && role.title === "Software Engineer" && gender === "female") {
      factor *= 0.92;
    }
    if (countryCode === "IN" && role.title === "Software Engineer") {
      factor = Math.exp(rng.number.float({ min: -0.1, max: 0.1 }));
      if (hireDate > monthsBefore(today, 18)) factor *= 1.18;
    }
    const outlier = rng.number.float();
    if (outlier < 0.005) factor *= 2.2;
    else if (outlier < 0.01) factor *= 0.45;

    const step = market.step * 10 ** currencyExponent(currencyForCountry(countryCode));
    const salaryAmount = roundTo(
      role.usdMedian * market.perUsd * factor * (step / market.step),
      step,
    );

    const history = buildHistory(rng, { hireDate, today, salaryAmount, step });

    const { firstName, lastName } = personName(market.names, gender, names, rng);
    const code = `EMP-${String(i).padStart(5, "0")}`;
    const person: SeedEmployee = {
      employee: {
        employeeCode: code,
        fullName: `${firstName} ${lastName}`,
        email: `${slug(firstName)}.${slug(lastName)}.${i}@acme.test`,
        jobTitle: role.title,
        department: role.department,
        countryCode,
        salaryAmount,
        gender,
        employmentType,
        hireDate,
      },
      history,
    };
    if (rng.number.float() < 0.03) person.deactivationReason = "Resigned";
    people.push(person);
  }
  return people;
}

function personName(
  style: "en" | "in" | "de" | "jp",
  gender: Gender,
  names: Record<"en" | "in" | "de", Faker>,
  rng: Faker,
) {
  const sex = gender === "female" ? "female" : gender === "male" ? "male" : undefined;
  if (style === "jp") {
    const pool = JP_FIRST[sex ?? (rng.datatype.boolean() ? "female" : "male")];
    return {
      firstName: rng.helpers.arrayElement(pool),
      lastName: rng.helpers.arrayElement(JP_LAST),
    };
  }
  const faker = names[style];
  return { firstName: faker.person.firstName(sex), lastName: faker.person.lastName() };
}

const roundTo = (amount: number, step: number) => Math.max(step, Math.round(amount / step) * step);

function buildHistory(
  rng: Faker,
  {
    hireDate,
    today,
    salaryAmount,
    step,
  }: { hireDate: string; today: string; salaryAmount: number; step: number },
): SeedRevision[] {
  const daysEmployed = Math.floor((toDate(today) - toDate(hireDate)) / DAY_MS);
  const raiseCount =
    daysEmployed > 365 && rng.number.float() < 0.33 ? rng.number.int({ min: 1, max: 3 }) : 0;

  const dates = Array.from({ length: raiseCount }, () =>
    toIso(toDate(hireDate) + rng.number.int({ min: 180, max: daysEmployed }) * DAY_MS),
  ).sort();
  const reasons = dates.map(() =>
    rng.helpers.weightedArrayElement([
      { value: "merit" as const, weight: 6 },
      { value: "promotion" as const, weight: 2 },
      { value: "market_adjustment" as const, weight: 2 },
    ]),
  );

  const amounts = [salaryAmount];
  for (let i = 0; i < raiseCount; i++) {
    const later = amounts[0]!;
    const earlier = roundTo(later / (1 + rng.number.float({ min: 0.04, max: 0.12 })), step);
    amounts.unshift(earlier < later ? earlier : Math.max(1, later - step));
  }

  return [
    { amount: amounts[0]!, effectiveOn: hireDate, reason: "hire" },
    ...dates.map((effectiveOn, i) => ({
      amount: amounts[i + 1]!,
      effectiveOn,
      reason: reasons[i]!,
    })),
  ];
}
