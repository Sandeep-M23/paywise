import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmployeeCreateInput } from "@paywise/shared";
import { createEmployeeService } from "../src/services/employees";
import { createInsightsService } from "../src/services/insights";
import { fixedClock } from "../src/lib/clock";
import { createTestDb } from "./db";

/*
 * Hand-computed fixture (amounts in minor units):
 *   IN Software Engineer, Engineering: 10000, 20000, 30000, 50000
 *   IN Product Manager,   Product:     100000
 *   IN inactive:                       999999  (must be ignored everywhere)
 *   DE Software Engineer, Engineering: 7000000
 *
 * IN all active: n=5, sum=210000, min=10000, max=100000, mean=42000, median=30000
 * IN Software Engineer: n=4, mean=27500, median=25000 (even count: interpolated)
 */
const base: Omit<EmployeeCreateInput, "employeeCode" | "email" | "salaryAmount"> = {
  fullName: "Test Person",
  jobTitle: "Software Engineer",
  department: "Engineering",
  countryCode: "IN",
  gender: "undisclosed",
  employmentType: "full_time",
  hireDate: "2022-01-01",
};

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let insights: ReturnType<typeof createInsightsService>;

beforeAll(async () => {
  testDb = await createTestDb();
  insights = createInsightsService({ db: testDb.db });
});
afterAll(() => testDb.close());

beforeEach(async () => {
  await testDb.reset();
  const employees = createEmployeeService({ db: testDb.db, clock: fixedClock("2026-06-30") });
  let n = 0;
  const add = async (salaryAmount: number, extra: Partial<EmployeeCreateInput> = {}) => {
    n += 1;
    return employees.create({
      ...base,
      employeeCode: `EMP-${n}`,
      email: `p${n}@acme.test`,
      salaryAmount,
      ...extra,
    });
  };
  for (const amount of [10_000, 20_000, 30_000, 50_000]) await add(amount);
  await add(100_000, { jobTitle: "Product Manager", department: "Product" });
  const leaver = await add(999_999);
  await employees.deactivate(leaver.id, { reason: "Left" });
  await add(7_000_000, { countryCode: "DE" });
});

describe("countrySummaries", () => {
  it("summarises active employees per country in local currency", async () => {
    expect(await insights.countrySummaries()).toEqual([
      {
        countryCode: "DE",
        currency: "eur",
        headcount: 1,
        total: 7_000_000,
        min: 7_000_000,
        max: 7_000_000,
        mean: 7_000_000,
        median: 7_000_000,
      },
      {
        countryCode: "IN",
        currency: "inr",
        headcount: 5,
        total: 210_000,
        min: 10_000,
        max: 100_000,
        mean: 42_000,
        median: 30_000,
      },
    ]);
  });
});

describe("jobTitles", () => {
  it("summarises each job title within a country, interpolating even-count medians", async () => {
    expect(await insights.jobTitles("IN")).toEqual([
      {
        jobTitle: "Product Manager",
        headcount: 1,
        min: 100_000,
        max: 100_000,
        mean: 100_000,
        median: 100_000,
      },
      {
        jobTitle: "Software Engineer",
        headcount: 4,
        min: 10_000,
        max: 50_000,
        mean: 27_500,
        median: 25_000,
      },
    ]);
  });

  it("returns an empty list for a country with no employees", async () => {
    expect(await insights.jobTitles("JP")).toEqual([]);
  });
});

describe("departments", () => {
  it("summarises each department within a country", async () => {
    expect(await insights.departments("IN")).toEqual([
      { department: "Engineering", headcount: 4, total: 110_000, mean: 27_500, median: 25_000 },
      { department: "Product", headcount: 1, total: 100_000, mean: 100_000, median: 100_000 },
    ]);
  });
});

describe("distribution", () => {
  it("splits the country's range into equal integer-width buckets, including empty ones", async () => {
    // width = ceil((100000 - 10000 + 1) / 5) = 18001
    expect(await insights.distribution("IN", 5)).toEqual({
      currency: "inr",
      buckets: [
        { from: 10_000, to: 28_001, count: 2 },
        { from: 28_001, to: 46_002, count: 1 },
        { from: 46_002, to: 64_003, count: 1 },
        { from: 64_003, to: 82_004, count: 0 },
        { from: 82_004, to: 100_005, count: 1 },
      ],
    });
  });

  it("returns a single bucket when everyone earns the same", async () => {
    expect(await insights.distribution("DE", 5)).toEqual({
      currency: "eur",
      buckets: [{ from: 7_000_000, to: 7_000_001, count: 1 }],
    });
  });

  it("returns no buckets for a country with no employees", async () => {
    expect(await insights.distribution("JP", 5)).toEqual({ currency: "jpy", buckets: [] });
  });
});
