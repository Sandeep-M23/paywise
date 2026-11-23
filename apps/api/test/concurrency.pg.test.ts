import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmployeeCreateInput } from "@paywise/shared";
import { createDb, dbConfigFromEnv, execute } from "../src/config/db";
import { syncSchema } from "../src/config/sync";
import { createEmployeeService } from "../src/services/employees/employees-service";
import { isHttpError, type ApiHttpError } from "../src/utils/helpers/errors";
import { fixedClock } from "../src/utils/helpers/clock";

const url = process.env.TEST_PG_URL;

const person = (n: number): EmployeeCreateInput => ({
  employeeCode: `EMP-${String(n).padStart(5, "0")}`,
  fullName: `Person ${n}`,
  email: `person.${n}@acme.test`,
  jobTitle: "Software Engineer",
  department: "Engineering",
  countryCode: "IN",
  salaryAmount: 100_000_000 + n * 1_000_000,
  gender: "undisclosed",
  employmentType: "full_time",
  hireDate: "2022-04-01",
});

describe.skipIf(!url)("concurrent writes on real Postgres", () => {
  let handle: ReturnType<typeof createDb>;
  let service: ReturnType<typeof createEmployeeService>;

  beforeAll(async () => {
    const config = { ...dbConfigFromEnv({ DATABASE_URL: url }), poolMax: 10 };
    if (!/_(test|ci)$/.test(config.database)) {
      throw new Error(
        `TEST_PG_URL must name a throwaway database (*_test or *_ci), not ${config.database}`,
      );
    }
    handle = createDb(config);
    await execute(handle.db, "DROP SCHEMA public CASCADE; CREATE SCHEMA public");
    await syncSchema(handle.db);
    service = createEmployeeService({ db: handle.db, clock: fixedClock("2026-06-30") });
  });
  beforeEach(() => execute(handle.db, "TRUNCATE salary_revisions, employees, imports CASCADE"));
  afterAll(() => handle.close());

  it("two people changing the same salary at once: one wins, the other gets stale_salary", async () => {
    const created = await service.create(person(1));
    const seen = created.revisions[0]!.id;

    const results = await Promise.allSettled([
      service.changeSalary(created.id, {
        amount: 120_000_000,
        effectiveOn: "2026-05-01",
        reason: "merit",
        basedOnRevisionId: seen,
      }),
      service.changeSalary(created.id, {
        amount: 130_000_000,
        effectiveOn: "2026-05-02",
        reason: "merit",
        basedOnRevisionId: seen,
      }),
    ]);

    const rejected = results.filter((r) => r.status === "rejected");
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const error = (rejected[0] as PromiseRejectedResult).reason;
    expect(isHttpError(error) && (error as ApiHttpError).code).toBe("stale_salary");
    expect((await service.get(created.id)).revisions).toHaveLength(2);
  });

  it("overlapping raise plans locking the same people at once all complete, without deadlock", async () => {
    const people = await Promise.all(
      Array.from({ length: 200 }, (_, i) => service.create(person(i + 1))),
    );
    const ids = people.map((p) => p.id);
    const plans = [
      { percent: 5, country: "IN" as const, effectiveOn: "2026-07-01" },
      {
        overrides: [...ids]
          .reverse()
          .slice(0, 150)
          .map((employeeId) => ({ employeeId, percent: 3 })),
        effectiveOn: "2026-07-02",
      },
      {
        overrides: ids.slice(50).map((employeeId) => ({ employeeId, percent: 2 })),
        effectiveOn: "2026-07-03",
      },
      { percent: 1, jobTitle: "Software Engineer", effectiveOn: "2026-07-04" },
    ];

    const results = await Promise.allSettled(
      plans.map((plan) => service.applyRaises({ ...plan, reason: "merit" })),
    );

    expect(results.map((r) => r.status)).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "fulfilled",
    ]);
    expect(await service.cacheDrift()).toBe(0);
  });
});
