import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmployeeCreateInput } from "@paywise/shared";
import { createEmployeeService } from "../src/services/employees/employees-service";
import { isHttpError, type ApiHttpError } from "../src/utils/helpers/errors";
import { fixedClock } from "../src/utils/helpers/clock";
import { createTestDb } from "./db";

const TODAY = "2026-06-30";

const priya: EmployeeCreateInput = {
  employeeCode: "EMP-00001",
  fullName: "Priya Sharma",
  email: "priya.sharma@acme.test",
  jobTitle: "Software Engineer",
  department: "Engineering",
  countryCode: "IN",
  salaryAmount: 180_000_000,
  gender: "female",
  employmentType: "full_time",
  hireDate: "2022-04-01",
};

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let service: ReturnType<typeof createEmployeeService>;

beforeAll(async () => {
  testDb = await createTestDb();
  service = createEmployeeService({ db: testDb.db, clock: fixedClock(TODAY) });
});
beforeEach(() => testDb.reset());
afterAll(() => testDb.close());

async function expectHttpError(promise: Promise<unknown>, status: number, code?: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(isHttpError(error)).toBe(true);
  expect((error as ApiHttpError).status).toBe(status);
  if (code) expect((error as ApiHttpError).code).toBe(code);
}

describe("create", () => {
  it("derives currency from country and records a hire revision", async () => {
    const created = await service.create(priya);

    expect(created).toMatchObject({
      employeeCode: "EMP-00001",
      salary: { amount: 180_000_000, currency: "inr" },
      status: "active",
    });
    expect(created.revisions).toEqual([
      expect.objectContaining({
        amount: 180_000_000,
        previousAmount: null,
        currency: "inr",
        effectiveOn: "2022-04-01",
        reason: "hire",
      }),
    ]);
  });

  it("rejects a duplicate employee code", async () => {
    await service.create(priya);
    await expectHttpError(
      service.create({ ...priya, email: "other@acme.test" }),
      409,
      "duplicate_employee_code",
    );
  });

  it("rejects a duplicate email regardless of case", async () => {
    await service.create(priya);
    await expectHttpError(
      service.create({ ...priya, employeeCode: "EMP-00002", email: "PRIYA.SHARMA@acme.test" }),
      409,
      "duplicate_email",
    );
  });

  it("accepts a hire date in the future (a pre-boarded hire)", async () => {
    const created = await service.create({ ...priya, hireDate: "2026-07-01" });
    expect(created.salary.amount).toBe(180_000_000);
    expect(created.revisions).toEqual([
      expect.objectContaining({ reason: "hire", effectiveOn: "2026-07-01" }),
    ]);
  });
});

describe("get", () => {
  it("returns 404 for an unknown or malformed id", async () => {
    await expectHttpError(service.get("8f6a3a8e-3c43-4b8e-9b0a-2b7f5f9a1c11"), 404);
    await expectHttpError(service.get("not-a-uuid"), 404);
  });

  it("includes gender on the detail view", async () => {
    const { id } = await service.create(priya);
    expect(await service.get(id)).toMatchObject({ gender: "female" });
  });
});

describe("changeSalary", () => {
  it("appends a revision with the previous amount and updates the current salary", async () => {
    const { id } = await service.create(priya);

    await service.changeSalary(id, {
      amount: 200_000_000,
      effectiveOn: "2026-04-01",
      reason: "promotion",
      note: "Promoted to Senior",
    });

    const employee = await service.get(id);
    expect(employee.salary.amount).toBe(200_000_000);
    expect(employee.revisions[0]).toMatchObject({
      amount: 200_000_000,
      previousAmount: 180_000_000,
      reason: "promotion",
      note: "Promoted to Senior",
    });
    expect(employee.revisions).toHaveLength(2);
  });

  it("rejects an effective date before the hire date", async () => {
    const { id } = await service.create(priya);
    await expectHttpError(
      service.changeSalary(id, { amount: 200_000_000, effectiveOn: "2022-03-31", reason: "merit" }),
      422,
    );
  });

  it("schedules a future change without touching the current salary", async () => {
    const { id } = await service.create(priya);
    const employee = await service.changeSalary(id, {
      amount: 200_000_000,
      effectiveOn: "2026-07-01",
      reason: "merit",
    });
    expect(employee.salary.amount).toBe(180_000_000);
    expect(employee.revisions[0]).toMatchObject({
      amount: 200_000_000,
      effectiveOn: "2026-07-01",
      state: "scheduled",
    });
  });

  it("rejects an effective date before the latest revision", async () => {
    const { id } = await service.create(priya);
    await service.changeSalary(id, {
      amount: 200_000_000,
      effectiveOn: "2026-04-01",
      reason: "merit",
    });
    await expectHttpError(
      service.changeSalary(id, { amount: 210_000_000, effectiveOn: "2025-04-01", reason: "merit" }),
      422,
    );
  });

  it("rejects a change to the same amount", async () => {
    const { id } = await service.create(priya);
    await expectHttpError(
      service.changeSalary(id, { amount: 180_000_000, effectiveOn: TODAY, reason: "merit" }),
      422,
    );
  });

  it("rejects a change for an inactive employee", async () => {
    const { id } = await service.create(priya);
    await service.deactivate(id, { reason: "Resigned" });
    await expectHttpError(
      service.changeSalary(id, { amount: 200_000_000, effectiveOn: TODAY, reason: "merit" }),
      409,
    );
  });
});

describe("update", () => {
  it("updates editable fields", async () => {
    const { id } = await service.create(priya);
    const updated = await service.update(id, { jobTitle: "Senior Software Engineer" });
    expect(updated.jobTitle).toBe("Senior Software Engineer");
  });

  it("rejects an email that belongs to someone else", async () => {
    await service.create(priya);
    const other = await service.create({
      ...priya,
      employeeCode: "EMP-00002",
      email: "arjun@acme.test",
    });
    await expectHttpError(service.update(other.id, { email: priya.email }), 409, "duplicate_email");
  });

  it("moves the hire revision when the hire date is corrected", async () => {
    const { id } = await service.create(priya);
    const updated = await service.update(id, { hireDate: "2022-03-15" });
    expect(updated.revisions.at(-1)).toMatchObject({ reason: "hire", effectiveOn: "2022-03-15" });
    expect(await service.cacheDrift()).toBe(0);
  });

  it("rejects a hire date after an existing salary change", async () => {
    const { id } = await service.create(priya);
    await service.changeSalary(id, {
      amount: 200_000_000,
      effectiveOn: "2023-04-01",
      reason: "merit",
    });
    await expectHttpError(service.update(id, { hireDate: "2023-05-01" }), 422);
  });
});

describe("deactivate", () => {
  it("marks the employee inactive with a reason and keeps history", async () => {
    const { id } = await service.create(priya);
    const result = await service.deactivate(id, { reason: "Resigned" });
    expect(result).toMatchObject({ status: "inactive", deactivationReason: "Resigned" });
    expect(result.revisions).toHaveLength(1);
  });

  it("rejects deactivating twice", async () => {
    const { id } = await service.create(priya);
    await service.deactivate(id, { reason: "Resigned" });
    await expectHttpError(service.deactivate(id, { reason: "Again" }), 409);
  });
});

describe("list", () => {
  const people: EmployeeCreateInput[] = [
    { ...priya },
    {
      ...priya,
      employeeCode: "EMP-00002",
      fullName: "Arjun Mehta",
      email: "arjun@acme.test",
      salaryAmount: 250_000_000,
      department: "Product",
      jobTitle: "Product Manager",
    },
    {
      ...priya,
      employeeCode: "EMP-00003",
      fullName: "Anna Schmidt",
      email: "anna@acme.test",
      countryCode: "DE",
      salaryAmount: 7_000_000,
    },
    {
      ...priya,
      employeeCode: "EMP-00004",
      fullName: "Kenji Sato",
      email: "kenji@acme.test",
      countryCode: "JP",
      salaryAmount: 9_000_000,
    },
  ];
  const defaults = {
    page: 1,
    pageSize: 25,
    sort: "fullName",
    order: "asc",
    status: "active",
  } as const;

  beforeEach(async () => {
    for (const person of people) await service.create(person);
  });

  it("pages results and reports the total", async () => {
    const page = await service.list({ ...defaults, pageSize: 2, page: 2 });
    expect(page.total).toBe(4);
    expect(page.data.map((e) => e.fullName)).toEqual(["Kenji Sato", "Priya Sharma"]);
  });

  it("filters by country, department and job title", async () => {
    expect((await service.list({ ...defaults, country: ["IN"] })).total).toBe(2);
    expect((await service.list({ ...defaults, department: ["Product"] })).total).toBe(1);
    expect((await service.list({ ...defaults, jobTitle: ["Software Engineer"] })).total).toBe(3);
  });

  it("matches any of several values within a filter, and all filters together", async () => {
    expect((await service.list({ ...defaults, country: ["IN", "JP"] })).total).toBe(3);
    expect(
      (await service.list({ ...defaults, country: ["IN", "DE"], department: ["Product"] })).total,
    ).toBe(1);
  });

  it("searches name, email and code case-insensitively", async () => {
    expect((await service.list({ ...defaults, q: "SCHMIDT" })).data[0]?.fullName).toBe(
      "Anna Schmidt",
    );
    expect((await service.list({ ...defaults, q: "kenji@" })).total).toBe(1);
    expect((await service.list({ ...defaults, q: "emp-00002" })).total).toBe(1);
  });

  it("treats search wildcards literally", async () => {
    expect((await service.list({ ...defaults, q: "%" })).total).toBe(0);
  });

  it("sorts by salary", async () => {
    const page = await service.list({
      ...defaults,
      country: ["IN"],
      sort: "salaryAmount",
      order: "desc",
    });
    expect(page.data.map((e) => e.employeeCode)).toEqual(["EMP-00002", "EMP-00001"]);
  });

  it("hides inactive employees unless asked", async () => {
    const [first] = (await service.list({ ...defaults, q: "Kenji" })).data;
    await service.deactivate(first!.id, { reason: "Left" });
    expect((await service.list(defaults)).total).toBe(3);
    expect((await service.list({ ...defaults, status: "inactive" })).total).toBe(1);
    expect((await service.list({ ...defaults, status: "all" })).total).toBe(4);
  });

  it("does not expose gender in list results", async () => {
    const page = await service.list(defaults);
    expect(page.data[0]).not.toHaveProperty("gender");
  });
});

describe("applyRaises", () => {
  let ids: { priya: string; rahul: string; anna: string };
  beforeEach(async () => {
    const priyaRow = await service.create(priya);
    const rahul = await service.create({
      ...priya,
      employeeCode: "EMP-00002",
      fullName: "Rahul Verma",
      email: "rahul@acme.test",
      salaryAmount: 120_000_001,
    });
    const anna = await service.create({
      ...priya,
      employeeCode: "EMP-00003",
      fullName: "Anna Schmidt",
      email: "anna@acme.test",
      countryCode: "DE",
      salaryAmount: 6_000_000,
    });
    ids = { priya: priyaRow.id, rahul: rahul.id, anna: anna.id };
  });

  const when = { effectiveOn: TODAY, reason: "merit" as const };

  it("applies a group raise and individual raises together, as salary revisions", async () => {
    const result = await service.applyRaises({
      percent: 10,
      country: "IN",
      overrides: [{ employeeId: ids.anna, newAmount: 6_600_000 }],
      ...when,
    });

    expect(result).toEqual({ applied: 3, skipped: 0, scheduled: 0 });
    expect((await service.get(ids.priya)).salary.amount).toBe(198_000_000);
    expect((await service.get(ids.rahul)).salary.amount).toBe(132_000_001);
    const anna = await service.get(ids.anna);
    expect(anna.salary.amount).toBe(6_600_000);
    expect(anna.revisions[0]).toMatchObject({
      amount: 6_600_000,
      previousAmount: 6_000_000,
      currency: "eur",
      effectiveOn: TODAY,
      reason: "merit",
    });
  });

  it("is all or nothing: one bad date rejects the plan and changes nobody", async () => {
    await service.changeSalary(ids.priya, {
      amount: 190_000_000,
      effectiveOn: "2026-06-15",
      reason: "promotion",
    });

    await expectHttpError(
      service.applyRaises({
        percent: 10,
        country: "IN",
        effectiveOn: "2026-06-01",
        reason: "merit",
      }),
      422,
    );
    expect((await service.get(ids.rahul)).salary.amount).toBe(120_000_001);
    expect((await service.get(ids.priya)).salary.amount).toBe(190_000_000);
  });

  it("schedules every raise when the date is in the future", async () => {
    const result = await service.applyRaises({
      percent: 10,
      country: "IN",
      effectiveOn: "2026-07-01",
      reason: "merit",
    });
    expect(result).toEqual({ applied: 2, skipped: 0, scheduled: 2 });
    expect((await service.get(ids.priya)).salary.amount).toBe(180_000_000);
  });

  it("rejects an individual raise that is not above the current salary", async () => {
    await expectHttpError(
      service.applyRaises({
        overrides: [{ employeeId: ids.anna, newAmount: 5_000_000 }],
        ...when,
      }),
      422,
    );
  });

  it("rejects individual raises for inactive people", async () => {
    await service.deactivate(ids.anna, { reason: "Resigned" });
    await expectHttpError(
      service.applyRaises({ overrides: [{ employeeId: ids.anna, percent: 5 }], ...when }),
      422,
    );
  });

  it("skips people whose raise rounds to nothing", async () => {
    const tiny = await service.create({
      ...priya,
      employeeCode: "EMP-00004",
      email: "tiny@acme.test",
      countryCode: "JP",
      salaryAmount: 10,
    });
    const result = await service.applyRaises({ percent: 1, country: "JP", ...when });
    expect(result).toEqual({ applied: 0, skipped: 1, scheduled: 0 });
    expect((await service.get(tiny.id)).salary.amount).toBe(10);
  });
});
