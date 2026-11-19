import { describe, expect, it } from "vitest";
import { COUNTRY_CODES, employeeCreateSchema } from "@paywise/shared";
import { generateEmployees, type SeedEmployee } from "../src/scripts/seed/generate";

const TODAY = "2026-06-30";
const people = generateEmployees({ count: 3000, seed: 42, today: TODAY });

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

describe("generateEmployees", () => {
  it("generates the requested number of employees", () => {
    expect(people).toHaveLength(3000);
  });

  it("is deterministic for a seed and varies across seeds", () => {
    const again = generateEmployees({ count: 50, seed: 42, today: TODAY });
    expect(again).toEqual(people.slice(0, 50));
    const other = generateEmployees({ count: 50, seed: 7, today: TODAY });
    expect(other).not.toEqual(again);
  });

  it("produces records that pass the same validation as the API", () => {
    for (const { employee } of people) {
      expect(() => employeeCreateSchema.parse(employee)).not.toThrow();
    }
  });

  it("uses unique employee codes and emails", () => {
    expect(new Set(people.map((p) => p.employee.employeeCode)).size).toBe(people.length);
    expect(new Set(people.map((p) => p.employee.email)).size).toBe(people.length);
  });

  it("covers every supported country", () => {
    expect(new Set(people.map((p) => p.employee.countryCode))).toEqual(new Set(COUNTRY_CODES));
  });

  it("builds a consistent salary history for everyone", () => {
    for (const { employee, history } of people) {
      expect(history[0]).toMatchObject({ reason: "hire", effectiveOn: employee.hireDate });
      expect(history.at(-1)!.amount).toBe(employee.salaryAmount);
      for (let i = 1; i < history.length; i++) {
        expect(history[i]!.effectiveOn >= history[i - 1]!.effectiveOn).toBe(true);
        expect(history[i]!.amount).not.toBe(history[i - 1]!.amount);
      }
      expect(history.at(-1)!.effectiveOn <= TODAY).toBe(true);
    }
  });

  it("gives some employees raises and deactivates a few", () => {
    const withRaises = people.filter((p) => p.history.length > 1).length / people.length;
    expect(withRaises).toBeGreaterThan(0.2);
    expect(withRaises).toBeLessThan(0.5);
    const inactive = people.filter((p) => p.deactivationReason).length / people.length;
    expect(inactive).toBeGreaterThan(0.01);
    expect(inactive).toBeLessThan(0.06);
  });

  it("keeps zero-decimal JPY salaries in whole ten-thousands of yen", () => {
    for (const { employee } of people.filter((p) => p.employee.countryCode === "JP")) {
      expect(employee.salaryAmount % 10_000).toBe(0);
    }
  });

  describe("planted patterns (see docs/SEED_DATA.md)", () => {
    const group = (
      country: string,
      title: string,
      filter: (p: SeedEmployee) => boolean = () => true,
    ) =>
      people.filter(
        (p) =>
          p.employee.countryCode === country &&
          p.employee.jobTitle === title &&
          !p.deactivationReason &&
          filter(p),
      );

    it("plants a gender pay gap of roughly 8% for software engineers in Germany", () => {
      const salaries = (gender: string) =>
        group(
          "DE",
          "Software Engineer",
          (p) => p.employee.gender === gender && p.employee.employmentType === "full_time",
        ).map((p) => p.employee.salaryAmount);
      const gap = 1 - mean(salaries("female")) / mean(salaries("male"));
      expect(gap).toBeGreaterThan(0.05);
      expect(gap).toBeLessThan(0.12);
    });

    it("plants pay compression for software engineers in India", () => {
      const monthsAgo = (months: number) => {
        const date = new Date(`${TODAY}T00:00:00Z`);
        date.setUTCMonth(date.getUTCMonth() - months);
        return date.toISOString().slice(0, 10);
      };
      const recent = group("IN", "Software Engineer", (p) => p.employee.hireDate > monthsAgo(18));
      const tenured = group("IN", "Software Engineer", (p) => p.employee.hireDate < monthsAgo(36));
      expect(mean(recent.map((p) => p.employee.salaryAmount))).toBeGreaterThan(
        mean(tenured.map((p) => p.employee.salaryAmount)),
      );
    });
  });
});
