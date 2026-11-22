import { describe, expect, it } from "vitest";
import { z } from "zod";
import { COUNTRIES, currencyForCountry } from "../src/countries";
import {
  RAISE_REASONS,
  loginSchema,
  salaryRevisionFieldsSchema,
  withSalaryRevisionRules,
  deactivateEmployeeSchema,
  employeeCreateSchema,
  employeeListQuerySchema,
  employeeUpdateSchema,
  raiseApplySchema,
  raisePlanSchema,
  salaryRevisionCreateSchema,
} from "../src/schemas";

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
  it("accepts a currency override, lowercased, and rejects unsupported ones", () => {
    expect(
      employeeCreateSchema.parse({ ...validEmployee, salaryCurrency: "USD" }).salaryCurrency,
    ).toBe("usd");
    expect(
      employeeCreateSchema.safeParse({ ...validEmployee, salaryCurrency: "xyz" }).success,
    ).toBe(false);
  });

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

  it("accepts future dates, a currency change and a correction with its target", () => {
    const id = "4b0b8f0e-2f6d-4a39-9d5e-0c8f2f5f9a11";
    expect(
      salaryRevisionCreateSchema.safeParse({ ...valid, effectiveOn: "2030-01-01" }).success,
    ).toBe(true);
    expect(
      salaryRevisionCreateSchema.parse({ ...valid, reason: "currency_change", currency: "USD" }),
    ).toMatchObject({ currency: "usd" });
    expect(
      salaryRevisionCreateSchema.safeParse({
        ...valid,
        reason: "correction",
        correctsRevisionId: id,
      }).success,
    ).toBe(true);
  });

  it("requires a target for a correction, and a currency for a currency change", () => {
    const id = "4b0b8f0e-2f6d-4a39-9d5e-0c8f2f5f9a11";
    expect(salaryRevisionCreateSchema.safeParse({ ...valid, reason: "correction" }).success).toBe(
      false,
    );
    expect(salaryRevisionCreateSchema.safeParse({ ...valid, correctsRevisionId: id }).success).toBe(
      false,
    );
    expect(
      salaryRevisionCreateSchema.safeParse({ ...valid, reason: "currency_change" }).success,
    ).toBe(false);
    expect(salaryRevisionCreateSchema.safeParse({ ...valid, currency: "btc" }).success).toBe(false);
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
      sort: "employeeCode",
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

  it("takes one or several countries, job titles and departments as a list", () => {
    expect(employeeListQuerySchema.parse({ country: "IN" }).country).toEqual(["IN"]);
    // Repeated query keys arrive as an array; duplicates are dropped.
    expect(employeeListQuerySchema.parse({ country: ["IN", "DE", "IN"] }).country).toEqual([
      "IN",
      "DE",
    ]);
    // Commas belong to the value, so a job title like this still filters as one.
    expect(employeeListQuerySchema.parse({ jobTitle: "VP, Sales" }).jobTitle).toEqual([
      "VP, Sales",
    ]);
    expect(employeeListQuerySchema.parse({}).department).toBeUndefined();
    expect(employeeListQuerySchema.safeParse({ country: ["IN", "XX"] }).success).toBe(false);
    expect(employeeListQuerySchema.safeParse({ country: [] }).success).toBe(false);
  });

  it("caps page size and whitelists sort columns", () => {
    expect(employeeListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
    expect(employeeListQuerySchema.safeParse({ sort: "password" }).success).toBe(false);
  });
});

describe("raisePlanSchema", () => {
  const id = "4b0b8f0e-2f6d-4a39-9d5e-0c8f2f5f9a11";
  const other = "9a3c1e2d-7b6f-4c5a-8e9d-1f2a3b4c5d6e";

  it("accepts a group raise with no individual raises", () => {
    expect(raisePlanSchema.parse({ percent: 5, country: "IN" })).toEqual({
      percent: 5,
      country: ["IN"],
      overrides: [],
    });
  });

  it("targets several countries, departments or job titles at once", () => {
    expect(
      raisePlanSchema.parse({ percent: 3, country: ["IN", "DE"], department: ["Sales", "Data"] }),
    ).toMatchObject({ country: ["IN", "DE"], department: ["Sales", "Data"] });
  });

  it("accepts individual raises alone, as a percent or a new salary", () => {
    const plan = raisePlanSchema.parse({
      percent: 0,
      overrides: [
        { employeeId: id, percent: 12.5 },
        { employeeId: other, newAmount: 250_000_000 },
      ],
    });
    expect(plan.overrides).toHaveLength(2);
  });

  it("needs a group raise or at least one individual raise", () => {
    const result = raisePlanSchema.safeParse({ percent: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/group raise|individual/i);
  });

  it("needs exactly one of percent or new salary per person", () => {
    expect(raisePlanSchema.safeParse({ overrides: [{ employeeId: id }] }).success).toBe(false);
    expect(
      raisePlanSchema.safeParse({
        overrides: [{ employeeId: id, percent: 5, newAmount: 100 }],
      }).success,
    ).toBe(false);
  });

  it("rejects the same person twice", () => {
    const result = raisePlanSchema.safeParse({
      overrides: [
        { employeeId: id, percent: 5 },
        { employeeId: id, percent: 6 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("keeps the percent limits and two decimal places", () => {
    expect(raisePlanSchema.safeParse({ percent: 101 }).success).toBe(false);
    expect(raisePlanSchema.safeParse({ percent: 1.234 }).success).toBe(false);
    expect(raisePlanSchema.safeParse({ percent: -1 }).success).toBe(false);
  });
});

describe("raiseApplySchema", () => {
  it("adds when and why to the plan", () => {
    const parsed = raiseApplySchema.parse({
      percent: 3,
      effectiveOn: "2026-07-01",
      reason: "merit",
    });
    expect(parsed).toMatchObject({ percent: 3, effectiveOn: "2026-07-01", reason: "merit" });
  });

  it("only allows reasons a person can choose", () => {
    expect(
      raiseApplySchema.safeParse({ percent: 3, effectiveOn: "2026-07-01", reason: "import" })
        .success,
    ).toBe(false);
  });
});

describe("salary change form schema", () => {
  // The web form swaps the amount for text; Zod 4 can't .omit() a refined schema,
  // so the fields and the rules are exported separately and recombined.
  const formSchema = withSalaryRevisionRules(
    salaryRevisionFieldsSchema.omit({ amount: true }).extend({ amount: z.string() }),
  );
  const base = { amount: "1200.50", effectiveOn: "2026-06-30", reason: "merit" as const };

  it("accepts a plain change with the amount as text", () => {
    expect(formSchema.safeParse(base).success).toBe(true);
  });

  it("keeps the correction and currency-change rules", () => {
    expect(formSchema.safeParse({ ...base, reason: "correction" }).success).toBe(false);
    expect(formSchema.safeParse({ ...base, reason: "currency_change" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("trims and lowercases the email, so sign-in ignores case", () => {
    expect(loginSchema.parse({ email: "  HR@Acme.test ", password: "pw" })).toEqual({
      email: "hr@acme.test",
      password: "pw",
    });
  });

  it("requires both fields, each with its own message", () => {
    const result = loginSchema.safeParse({ email: " ", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join("."))).toEqual(["email", "password"]);
  });
});

describe("raiseApplySchema reasons", () => {
  const plan = { percent: 5, effectiveOn: "2026-06-30" };

  it("accepts the reasons a raise can have", () => {
    for (const reason of RAISE_REASONS) {
      expect(raiseApplySchema.safeParse({ ...plan, reason }).success).toBe(true);
    }
  });

  it("refuses a correction: it would correct no particular change", () => {
    expect(RAISE_REASONS).not.toContain("correction");
    expect(raiseApplySchema.safeParse({ ...plan, reason: "correction" }).success).toBe(false);
  });
});
