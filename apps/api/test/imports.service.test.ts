import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ImportRequest, ImportRowValues } from "@paywise/shared";
import { createEmployeeService } from "../src/services/employees";
import { createImportService } from "../src/services/imports";
import { fixedClock } from "../src/lib/clock";
import { createTestDb } from "./db";

const TODAY = "2026-06-30";
const clock = fixedClock(TODAY);

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let employees: ReturnType<typeof createEmployeeService>;
let imports: ReturnType<typeof createImportService>;

beforeAll(async () => {
  testDb = await createTestDb();
  employees = createEmployeeService({ db: testDb.db, clock });
  imports = createImportService({ db: testDb.db, clock });
});
afterAll(() => testDb.close());

// Existing employee in the database before each import.
beforeEach(async () => {
  await testDb.reset();
  await employees.create({
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
  });
});

const existingRow: ImportRowValues = {
  employeeCode: "EMP-00001",
  fullName: "Priya Sharma",
  email: "priya@acme.test",
  jobTitle: "Software Engineer",
  department: "Engineering",
  countryCode: "IN",
  salary: "18,00,000",
  employmentType: "full_time",
  hireDate: "2022-04-01",
};
const newRow: ImportRowValues = {
  ...existingRow,
  employeeCode: "EMP-00002",
  fullName: "Kenji Sato",
  email: "kenji@acme.test",
  countryCode: "JP",
  salary: "9000000",
};

const request = (...rows: ImportRowValues[]): ImportRequest => ({
  filename: "salaries.csv",
  rows: rows.map((values, i) => ({ line: i + 2, values })),
});

const count = async (table: string) =>
  (
    (await testDb.db.execute(sql.raw(`SELECT count(*)::int AS n FROM ${table}`))).rows[0] as {
      n: number;
    }
  ).n;

describe("preview", () => {
  it("classifies rows without saving anything", async () => {
    const preview = await imports.preview(
      request(existingRow, newRow, { ...newRow, employeeCode: "EMP-00003", email: "bad" }),
    );

    expect(preview.summary).toEqual({ total: 3, create: 1, update: 0, unchanged: 1, error: 1 });
    expect(preview.rows.map((r) => [r.line, r.status])).toEqual([
      [2, "unchanged"],
      [3, "create"],
      [4, "error"],
    ]);
    expect(preview.rows[2]!.errors).toEqual([expect.objectContaining({ field: "email" })]);
    expect(await count("employees")).toBe(1);
  });

  it("describes what an update will change", async () => {
    const preview = await imports.preview(
      request({ ...existingRow, salary: "20,00,000", jobTitle: "Senior Software Engineer" }),
    );
    expect(preview.rows[0]).toMatchObject({
      status: "update",
      currency: "inr",
      changes: expect.arrayContaining([
        { field: "jobTitle", from: "Software Engineer", to: "Senior Software Engineer" },
        { field: "salary", from: 180_000_000, to: 200_000_000 },
      ]),
    });
  });

  it("flags duplicates within the file, pointing at the first occurrence", async () => {
    const preview = await imports.preview(
      request(
        newRow,
        { ...newRow, email: "other@acme.test" },
        {
          ...newRow,
          employeeCode: "EMP-00009",
        },
      ),
    );
    expect(preview.rows.map((r) => r.status)).toEqual(["create", "error", "error"]);
    expect(preview.rows[1]!.errors![0]!.message).toMatch(/line 2/);
    expect(preview.rows[2]!.errors![0]).toMatchObject({ field: "email" });
  });

  it("rejects an email that belongs to a different existing employee", async () => {
    const preview = await imports.preview(request({ ...newRow, email: "PRIYA@acme.test" }));
    expect(preview.rows[0]).toMatchObject({
      status: "error",
      errors: [expect.objectContaining({ field: "email" })],
    });
  });

  it("rejects changing an existing employee's country", async () => {
    const preview = await imports.preview(request({ ...existingRow, countryCode: "US" }));
    expect(preview.rows[0]).toMatchObject({
      status: "error",
      errors: [expect.objectContaining({ field: "countryCode" })],
    });
  });

  it("rejects hire dates in the future", async () => {
    const preview = await imports.preview(request({ ...newRow, hireDate: "2026-07-01" }));
    expect(preview.rows[0]!.status).toBe("error");
  });

  it("treats a missing gender column as 'keep what is stored'", async () => {
    const preview = await imports.preview(request(existingRow));
    expect(preview.rows[0]!.status).toBe("unchanged");
  });
});

describe("commit", () => {
  it("creates, updates and skips in one go, recording the import", async () => {
    const result = await imports.commit(
      request({ ...existingRow, salary: "20,00,000" }, newRow, { ...newRow, email: "x" }),
    );

    expect(result).toMatchObject({ created: 1, updated: 1, unchanged: 0, skipped: 1 });
    expect(await count("employees")).toBe(2);

    const [log] = await imports.list();
    expect(log).toMatchObject({
      id: result.importId,
      filename: "salaries.csv",
      rowCount: 3,
      createdCount: 1,
      updatedCount: 1,
      skippedCount: 1,
      status: "committed",
    });
  });

  it("records salary changes in history with the import as the source", async () => {
    const { importId } = await imports.commit(request({ ...existingRow, salary: "20,00,000" }));
    const [priya] = (
      await employees.list({
        page: 1,
        pageSize: 1,
        sort: "fullName",
        order: "asc",
        status: "active",
        q: "Priya",
      })
    ).data;
    const detail = await employees.get(priya!.id);

    expect(detail.salary.amount).toBe(200_000_000);
    expect(detail.revisions[0]).toMatchObject({
      reason: "import",
      amount: 200_000_000,
      previousAmount: 180_000_000,
      effectiveOn: TODAY,
      importId,
    });
  });

  it("gives new employees a hire revision linked to the import", async () => {
    const { importId } = await imports.commit(request(newRow));
    const [kenji] = (
      await employees.list({
        page: 1,
        pageSize: 1,
        sort: "fullName",
        order: "asc",
        status: "active",
        q: "Kenji",
      })
    ).data;
    const detail = await employees.get(kenji!.id);
    expect(detail).toMatchObject({
      gender: "undisclosed",
      salary: { amount: 9_000_000, currency: "jpy" },
    });
    expect(detail.revisions).toEqual([
      expect.objectContaining({ reason: "hire", effectiveOn: "2022-04-01", importId }),
    ]);
  });

  it("refuses to commit when there is nothing valid to import", async () => {
    await expect(imports.commit(request({ ...newRow, email: "x" }))).rejects.toMatchObject({
      status: 422,
    });
    expect(await count("imports")).toBe(0);
  });
});

describe("detail", () => {
  it("records who ran the import and what each row did", async () => {
    const { importId } = await imports.commit(
      request({ ...existingRow, salary: "20,00,000" }, newRow, { ...newRow, email: "x" }),
      { by: "hr@acme.test" },
    );

    const detail = await imports.get(importId);
    expect(detail).toMatchObject({ id: importId, createdBy: "hr@acme.test", createdCount: 1 });
    expect(detail.rows.map((r) => r.status)).toEqual(["update", "create", "error"]);
    expect(detail.rows[0]!.changes).toEqual(
      expect.arrayContaining([expect.objectContaining({ to: expect.anything() })]),
    );
    expect(detail.rows[2]!.errors?.[0]).toMatchObject({ field: "email" });
  });

  it("leaves unchanged rows out of the record", async () => {
    const { importId } = await imports.commit(request(existingRow, newRow));
    const detail = await imports.get(importId);
    expect(detail.rows.map((r) => r.status)).toEqual(["create"]);
    expect(detail.createdBy).toBeNull();
  });

  it("is 404 for an unknown import", async () => {
    await expect(imports.get("00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("shows who ran each import in the list", async () => {
    await imports.commit(request(newRow), { by: "hr@acme.test" });
    const [log] = await imports.list();
    expect(log).toMatchObject({ createdBy: "hr@acme.test" });
  });
});
