import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ApiErrorBody, EmployeeDetail, Page, EmployeeSummary } from "@paywise/shared";
import { createApp } from "../src/app";
import { fixedClock } from "../src/lib/clock";
import { createTestDb } from "./db";

const body = {
  employeeCode: "EMP-00001",
  fullName: "Priya Sharma",
  email: "priya@acme.test",
  jobTitle: "Software Engineer",
  department: "Engineering",
  countryCode: "IN",
  salaryAmount: 180_000_000,
  employmentType: "full_time",
  hireDate: "2022-04-01",
};

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  testDb = await createTestDb();
  app = createApp({ db: testDb.db, clock: fixedClock("2026-06-30") });
});
beforeEach(() => testDb.reset());
afterAll(() => testDb.close());

const send = (method: string, path: string, json?: unknown) =>
  app.request(`/api${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: json === undefined ? undefined : typeof json === "string" ? json : JSON.stringify(json),
  });

describe("employee routes", () => {
  it("creates an employee (201) with a Stripe-style salary", async () => {
    const res = await send("POST", "/employees", body);
    expect(res.status).toBe(201);
    const created = (await res.json()) as EmployeeDetail;
    expect(created.salary).toEqual({ amount: 180_000_000, currency: "inr" });
  });

  it("returns 422 with field details for invalid input", async () => {
    const res = await send("POST", "/employees", { ...body, email: "nope", salaryAmount: -1 });
    expect(res.status).toBe(422);
    const { error } = (await res.json()) as ApiErrorBody;
    expect(error.code).toBe("validation_failed");
    expect(error.details?.map((d) => d.path).sort()).toEqual(["email", "salaryAmount"]);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await send("POST", "/employees", "{not json");
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicates", async () => {
    await send("POST", "/employees", body);
    const res = await send("POST", "/employees", body);
    expect(res.status).toBe(409);
  });

  it("lists with coerced query params and rejects unknown sort columns", async () => {
    await send("POST", "/employees", body);
    const ok = await send("GET", "/employees?page=1&pageSize=10&sort=salaryAmount&order=desc");
    expect(ok.status).toBe(200);
    const page = (await ok.json()) as Page<EmployeeSummary>;
    expect(page).toMatchObject({ page: 1, pageSize: 10, total: 1 });

    expect((await send("GET", "/employees?sort=password")).status).toBe(400);
  });

  it("changes a salary through the revisions endpoint", async () => {
    const { id } = (await (await send("POST", "/employees", body)).json()) as EmployeeDetail;
    const res = await send("POST", `/employees/${id}/salary-revisions`, {
      amount: 200_000_000,
      effectiveOn: "2026-04-01",
      reason: "merit",
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as EmployeeDetail).salary.amount).toBe(200_000_000);
  });

  it("ignores salary in a PATCH (salary changes need a revision)", async () => {
    const { id } = (await (await send("POST", "/employees", body)).json()) as EmployeeDetail;
    const res = await send("PATCH", `/employees/${id}`, { jobTitle: "Lead", salaryAmount: 1 });
    const updated = (await res.json()) as EmployeeDetail;
    expect(updated).toMatchObject({ jobTitle: "Lead", salary: { amount: 180_000_000 } });
  });

  it("deactivates and returns 404 for unknown ids and routes", async () => {
    const { id } = (await (await send("POST", "/employees", body)).json()) as EmployeeDetail;
    expect((await send("POST", `/employees/${id}/deactivate`, { reason: "Left" })).status).toBe(
      200,
    );
    expect((await send("GET", "/employees/unknown")).status).toBe(404);
    expect((await send("GET", "/nope")).status).toBe(404);
  });
});
