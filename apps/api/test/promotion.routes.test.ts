import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmployeeCreateInput, EmployeeSummary, Page } from "@paywise/shared";
import { createApp } from "../src/app";
import { promoteDueRevisionsDaily } from "../src/middlewares/promote-due";
import { createEmployeeService } from "../src/services/employees/employees-service";
import { fixedClock, type Clock } from "../src/utils/helpers/clock";
import { createTestDb } from "./db";
import { serve } from "./http";

const priya: EmployeeCreateInput = {
  employeeCode: "EMP-00001",
  fullName: "Priya Sharma",
  email: "priya@acme.test",
  jobTitle: "Software Engineer",
  department: "Engineering",
  countryCode: "IN",
  salaryAmount: 180_000_000,
  gender: "female",
  employmentType: "full_time",
  hireDate: "2022-04-01",
};

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
  testDb = await createTestDb();
});
beforeEach(() => testDb.reset());
afterAll(() => testDb.close());

async function scheduleRaise() {
  const before = createEmployeeService({ db: testDb.db, clock: fixedClock("2026-06-30") });
  const { id } = await before.create(priya);
  await before.changeSalary(id, {
    amount: 200_000_000,
    effectiveOn: "2026-07-01",
    reason: "merit",
  });
  return id;
}

describe("promoteDueRevisions", () => {
  it("makes a scheduled change current once its date arrives", async () => {
    const id = await scheduleRaise();
    const onTheDay = createEmployeeService({ db: testDb.db, clock: fixedClock("2026-07-01") });

    expect(await onTheDay.promoteDueRevisions()).toEqual({ promoted: 1 });
    expect((await onTheDay.get(id)).salary.amount).toBe(200_000_000);
    expect(await onTheDay.cacheDrift()).toBe(0);
    expect(await onTheDay.promoteDueRevisions()).toEqual({ promoted: 0 });
  });
});

describe("promoteDueRevisionsDaily middleware", () => {
  it("promotes on the first request of a day, then not again until the next day", async () => {
    let today = "2026-07-01";
    const clock: Clock = { today: () => today };
    let runs = 0;
    const middleware = promoteDueRevisionsDaily({
      clock,
      promote: async () => {
        runs++;
        return { promoted: 0 };
      },
    });
    const call = () =>
      new Promise<void>((resolve, reject) =>
        middleware({} as never, {} as never, (e?: unknown) => (e ? reject(e) : resolve())),
      );

    await Promise.all([call(), call()]);
    await call();
    expect(runs).toBe(1);

    today = "2026-07-02";
    await call();
    expect(runs).toBe(2);
  });

  it("tries again on the next request if promotion fails", async () => {
    let fail = true;
    const middleware = promoteDueRevisionsDaily({
      clock: fixedClock("2026-07-01"),
      promote: async () => {
        if (fail) throw new Error("database unavailable");
        return { promoted: 0 };
      },
    });
    const call = () =>
      new Promise<unknown>((resolve) => middleware({} as never, {} as never, resolve));

    expect(await call()).toBeInstanceOf(Error);
    fail = false;
    expect(await call()).toBeUndefined();
  });
});

describe("app", () => {
  it("shows a scheduled change as the current salary from its date, without a cron job", async () => {
    await scheduleRaise();
    const app = await serve(
      createApp({ db: testDb.db, clock: fixedClock("2026-07-01"), auth: "disabled" }),
    );
    try {
      const page = (await (
        await app.request("/api/employees?q=EMP-00001")
      ).json()) as Page<EmployeeSummary>;
      expect(page.data[0]!.salary.amount).toBe(200_000_000);
    } finally {
      await app.close();
    }
  });
});
