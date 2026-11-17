import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CountryCode, EmployeeCreateInput, Gender } from "@paywise/shared";
import { createEmployeeService } from "../src/services/employees";
import { createFairnessService } from "../src/services/fairness";
import { fixedClock } from "../src/lib/clock";
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
    employmentType: "full_time",
    hireDate: "2022-01-01",
  };
  return employees.create(input);
}

describe("outliers", () => {
  /*
   * IN Software Engineer (n=6): 100k, 102k, 104k, 106k, 108k, 300k
   *   Q1 = 102.5k, median = 105k, Q3 = 107.5k, IQR = 5k
   *   fences: 95k .. 115k  ->  300k is an outlier above
   * IN Product Manager (n=4, one extreme): too few peers, never flagged
   */
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

  it("filters by country and job title", async () => {
    expect(await fairness.outliers({ country: "US" })).toEqual([]);
    expect(await fairness.outliers({ jobTitle: "Product Manager" })).toEqual([]);
  });
});

describe("genderGaps", () => {
  /*
   * DE Software Engineer: 5 women at 90k, 5 men at 100k  -> 10% gap, flagged
   * GB Software Engineer: 5 women at 99k, 5 men at 100k  ->  1% gap, not flagged
   * US Software Engineer: 2 women, 5 men                 -> suppressed
   */
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
    await hire("DE", "Software Engineer", 1_000_000, "non_binary"); // not part of the comparison
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
      suppressed: true,
    });
  });

  it("lists flagged groups first, largest gap first, suppressed last", async () => {
    const groups = await fairness.genderGaps({});
    expect(groups.map((g) => g.countryCode)).toEqual(["DE", "GB", "US"]);
  });
});

describe("raiseCost", () => {
  /*
   * IN Engineering: 100,001 and 200,000 ; IN Product: 300,000 ; DE Engineering: 50,000
   * 10% raise, rounded per person to a whole minor unit:
   *   IN Engineering increase = round(10,000.1) + 20,000 = 30,000
   */
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

  it("supports fractional percentages and filters", async () => {
    expect(await fairness.raiseCost({ percent: 2.5, country: "IN" })).toEqual([
      { currency: "inr", headcount: 3, currentTotal: 600_001, increase: 15_000, newTotal: 615_001 },
    ]);
  });
});
