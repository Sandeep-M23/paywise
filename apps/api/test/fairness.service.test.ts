import { select } from "../src/config/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CountryCode, EmployeeCreateInput, EmploymentType, Gender } from "@paywise/shared";
import { createEmployeeService } from "../src/services/employees/employees-service";
import { createFairnessService } from "../src/services/fairness/fairness-service";
import { fixedClock } from "../src/utils/helpers/clock";
import { createTestDb } from "./db";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let fairness: ReturnType<typeof createFairnessService>;

beforeAll(async () => {
  testDb = await createTestDb();
  fairness = createFairnessService({ db: testDb.db });
});
afterAll(() => testDb.close());

let n = 0;
async function hire(
  countryCode: CountryCode,
  jobTitle: string,
  salaryAmount: number,
  gender: Gender = "undisclosed",
  department = "Engineering",
  employmentType: EmploymentType = "full_time",
) {
  n += 1;
  const employees = createEmployeeService({ db: testDb.db, clock: fixedClock("2026-06-30") });
  const input: EmployeeCreateInput = {
    employeeCode: `EMP-${n}`,
    fullName: `Person ${n}`,
    email: `p${n}@acme.test`,
    jobTitle,
    department,
    countryCode,
    salaryAmount,
    gender,
    employmentType,
    hireDate: "2022-01-01",
  };
  return employees.create(input);
}

async function idsBySalary() {
  const rows = await select<{ id: string; salary_amount: number }>(
    testDb.db,
    "SELECT id, salary_amount FROM employees",
  );
  return new Map(rows.map((r) => [Number(r.salary_amount), r.id]));
}

describe("outliers", () => {
  beforeEach(async () => {
    await testDb.reset();
    for (const amount of [100_000, 102_000, 104_000, 106_000, 108_000, 300_000]) {
      await hire("IN", "Software Engineer", amount);
    }
    for (const amount of [100_000, 100_000, 100_000, 900_000]) {
      await hire("IN", "Product Manager", amount, "undisclosed", "Product");
    }
  });

  it("flags salaries outside 1.5 x IQR of peers in the same role and country", async () => {
    const outliers = await fairness.outliers({});
    expect(outliers).toHaveLength(1);
    expect(outliers[0]).toMatchObject({
      jobTitle: "Software Engineer",
      salary: { amount: 300_000, currency: "inr" },
      peerCount: 6,
      peerMedian: 105_000,
      lowerFence: 95_000,
      upperFence: 115_000,
      direction: "above",
    });
    expect(outliers[0]!.deviation).toBeCloseTo(195_000 / 105_000, 5);
  });

  it("compares full-time employees only (part-time pay isn't like-for-like)", async () => {
    await hire("IN", "Software Engineer", 40_000, "undisclosed", "Engineering", "part_time");
    expect(await fairness.outliers({})).toHaveLength(1);
  });

  it("filters by country and job title", async () => {
    expect(await fairness.outliers({ country: "US" })).toEqual([]);
    expect(await fairness.outliers({ jobTitle: "Product Manager" })).toEqual([]);
  });
});

describe("genderGaps", () => {
  beforeEach(async () => {
    await testDb.reset();
    for (let i = 0; i < 5; i++) {
      await hire("DE", "Software Engineer", 9_000_000, "female");
      await hire("DE", "Software Engineer", 10_000_000, "male");
      await hire("GB", "Software Engineer", 9_900_000, "female");
      await hire("GB", "Software Engineer", 10_000_000, "male");
      await hire("US", "Software Engineer", 10_000_000, "male");
    }
    await hire("US", "Software Engineer", 5_000_000, "female");
    await hire("US", "Software Engineer", 5_000_000, "female");
    await hire("DE", "Software Engineer", 1_000_000, "non_binary");
    for (const amount of [60_000, 140_000, 90_000, 110_000, 100_000]) {
      await hire("CA", "Software Engineer", amount, "female");
      await hire("CA", "Software Engineer", amount + 10_000, "male");
    }
  });

  it("computes mean and median gaps and flags those of 5% or more", async () => {
    const groups = await fairness.genderGaps({});
    const de = groups.find((g) => g.countryCode === "DE")!;
    expect(de).toMatchObject({
      currency: "eur",
      femaleCount: 5,
      maleCount: 5,
      femaleMean: 9_000_000,
      maleMean: 10_000_000,
      flagged: true,
      significant: true,
      suppressed: false,
    });
    expect(de.meanGap).toBeCloseTo(0.1, 10);
    expect(de.medianGap).toBeCloseTo(0.1, 10);

    const gb = groups.find((g) => g.countryCode === "GB")!;
    expect(gb.flagged).toBe(false);
    expect(gb.meanGap).toBeCloseTo(0.01, 10);
  });

  it("hides figures for groups where either gender has fewer than 5 people", async () => {
    const us = (await fairness.genderGaps({})).find((g) => g.countryCode === "US")!;
    expect(us).toEqual({
      countryCode: "US",
      jobTitle: "Software Engineer",
      currency: "usd",
      femaleCount: 2,
      maleCount: 5,
      femaleMean: null,
      maleMean: null,
      femaleMedian: null,
      maleMedian: null,
      meanGap: null,
      medianGap: null,
      flagged: false,
      significant: false,
      suppressed: true,
    });
  });

  it("flags a 5% mean gap even when it is not statistically significant", async () => {
    const ca = (await fairness.genderGaps({})).find((g) => g.countryCode === "CA")!;
    expect(ca.meanGap).toBeCloseTo(10_000 / 110_000, 10);
    expect(ca).toMatchObject({ flagged: true, significant: false });
  });

  it("lists significant flagged gaps first, then flagged, then the rest, suppressed last", async () => {
    const groups = await fairness.genderGaps({});
    expect(groups.map((g) => g.countryCode)).toEqual(["DE", "CA", "GB", "US"]);
  });
});

describe("raiseCost", () => {
  beforeEach(async () => {
    await testDb.reset();
    await hire("IN", "Software Engineer", 100_001);
    await hire("IN", "Software Engineer", 200_000);
    await hire("IN", "Product Manager", 300_000, "undisclosed", "Product");
    await hire("DE", "Software Engineer", 50_000);
  });

  it("totals the cost per currency without changing any salaries", async () => {
    expect(await fairness.raiseCost({ percent: 10, department: "Engineering" })).toEqual([
      { currency: "eur", headcount: 1, currentTotal: 50_000, increase: 5_000, newTotal: 55_000 },
      { currency: "inr", headcount: 2, currentTotal: 300_001, increase: 30_000, newTotal: 330_001 },
    ]);
  });

  it("lets individual raises replace the group raise and reach people outside the group", async () => {
    const ids = await idsBySalary();
    expect(
      await fairness.raiseCost({
        percent: 10,
        country: "IN",
        department: "Engineering",
        overrides: [
          { employeeId: ids.get(200_000)!, newAmount: 250_000 },
          { employeeId: ids.get(300_000)!, percent: 5 },
        ],
      }),
    ).toEqual([
      { currency: "inr", headcount: 3, currentTotal: 600_001, increase: 75_000, newTotal: 675_001 },
    ]);
  });

  it("costs individual raises on their own when there is no group raise", async () => {
    const ids = await idsBySalary();
    expect(
      await fairness.raiseCost({
        percent: 0,
        overrides: [{ employeeId: ids.get(50_000)!, newAmount: 60_000 }],
      }),
    ).toEqual([
      { currency: "eur", headcount: 1, currentTotal: 50_000, increase: 10_000, newTotal: 60_000 },
    ]);
  });

  it("raises everyone in any of the chosen countries", async () => {
    const cost = await fairness.raiseCost({ percent: 10, country: ["IN", "DE"] });
    expect(cost.map((row) => [row.currency, row.headcount])).toEqual([
      ["eur", 1],
      ["inr", 3],
    ]);
  });

  it("supports fractional percentages and filters", async () => {
    expect(await fairness.raiseCost({ percent: 2.5, country: "IN" })).toEqual([
      { currency: "inr", headcount: 3, currentTotal: 600_001, increase: 15_000, newTotal: 615_001 },
    ]);
  });
});
