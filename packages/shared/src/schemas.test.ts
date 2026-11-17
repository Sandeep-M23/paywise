import { describe, expect, it } from "vitest";
import { COUNTRIES, currencyForCountry } from "./countries";
import {
  deactivateEmployeeSchema,
  employeeCreateSchema,
  employeeListQuerySchema,
  employeeUpdateSchema,
  salaryRevisionCreateSchema,
} from "./schemas";

const validEmployee = {
  employeeCode: "EMP-00001",
  fullName: "Priya Sharma",
  email: "priya.sharma@acme.test",
  jobTitle: "Software Engineer",
  department: "Engineering",
  countryCode: "IN",
  salaryAmount: 180_000_000,
  employmentType: "full_time",
  hireDate: "2022-04-01",
};

describe("countries", () => {
  it("derives the currency from the country", () => {
    expect(currencyForCountry("IN")).toBe("inr");
    expect(currencyForCountry("JP")).toBe("jpy");
    expect(currencyForCountry("DE")).toBe("eur");
  });

  it("supports the eight seeded countries", () => {
    expect(COUNTRIES.map((c) => c.code).sort()).toEqual(
      ["AU", "CA", "DE", "GB", "IN", "JP", "SG", "US"].sort(),
    );
  });
});

describe("employeeCreateSchema", () => {
  it("accepts a valid employee and defaults gender to undisclosed", () => {
    const result = employeeCreateSchema.parse(validEmployee);
    expect(result.gender).toBe("undisclosed");
  });

  it("normalises text: trims names, upper-cases codes, lower-cases email", () => {
    const result = employeeCreateSchema.parse({
      ...validEmployee,
      employeeCode: " emp-00001 ",
      fullName: "  Priya Sharma ",
      email: " Priya.Sharma@ACME.test ",
    });
    expect(result).toMatchObject({
      employeeCode: "EMP-00001",
      fullName: "Priya Sharma",
      email: "priya.sharma@acme.test",
    });
  });

  it.each([
    ["fullName", ""],
    ["email", "not-an-email"],
    ["countryCode", "FR"],
    ["salaryAmount", 0],
    ["salaryAmount", -100],
    ["salaryAmount", 100.5],
    ["employmentType", "intern"],
    ["hireDate", "2024-02-30"],
    ["hireDate", "01/04/2024"],
    ["employeeCode", "EMP 01"],
  ])("rejects invalid %s (%j)", (field, value) => {
    expect(employeeCreateSchema.safeParse({ ...validEmployee, [field]: value }).success).toBe(
      false,
    );
  });

  it("does not accept a currency from the client", () => {
    const result = employeeCreateSchema.parse({ ...validEmployee, salaryCurrency: "usd" });
    expect(result).not.toHaveProperty("salaryCurrency");
  });
});

describe("employeeUpdateSchema", () => {
  it("allows partial updates", () => {
    expect(employeeUpdateSchema.parse({ jobTitle: "Senior Engineer" })).toEqual({
      jobTitle: "Senior Engineer",
    });
  });

  it("strips immutable and salary fields", () => {
    const result = employeeUpdateSchema.parse({
      jobTitle: "Senior Engineer",
      countryCode: "US",
      employeeCode: "EMP-99999",
      salaryAmount: 1,
    });
    expect(result).toEqual({ jobTitle: "Senior Engineer" });
  });

  it("rejects an empty update", () => {
    expect(employeeUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("salaryRevisionCreateSchema", () => {
  const valid = { amount: 200_000_000, effectiveOn: "2026-04-01", reason: "promotion" };

  it("accepts a manual salary change", () => {
    expect(salaryRevisionCreateSchema.parse(valid)).toEqual(valid);
  });

  it("reserves system reasons (hire, import) for the system", () => {
    expect(salaryRevisionCreateSchema.safeParse({ ...valid, reason: "hire" }).success).toBe(false);
    expect(salaryRevisionCreateSchema.safeParse({ ...valid, reason: "import" }).success).toBe(
      false,
    );
  });

  it("requires a positive integer amount", () => {
    expect(salaryRevisionCreateSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });
});

describe("deactivateEmployeeSchema", () => {
  it("requires a reason", () => {
    expect(deactivateEmployeeSchema.safeParse({ reason: "  " }).success).toBe(false);
    expect(deactivateEmployeeSchema.parse({ reason: "Resigned" })).toEqual({ reason: "Resigned" });
  });
});

describe("employeeListQuerySchema", () => {
  it("applies defaults", () => {
    expect(employeeListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 25,
      sort: "fullName",
      order: "asc",
      status: "active",
    });
  });

  it("coerces query-string numbers", () => {
    expect(employeeListQuerySchema.parse({ page: "3", pageSize: "50" })).toMatchObject({
      page: 3,
      pageSize: 50,
    });
  });

  it("caps page size and whitelists sort columns", () => {
    expect(employeeListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
    expect(employeeListQuerySchema.safeParse({ sort: "password" }).success).toBe(false);
  });
});
