import Papa from "papaparse";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  autoMapColumns,
  unescapeCsvCell,
  type EmployeeCreateInput,
  type ImportPreview,
  type ImportRequest,
} from "@paywise/shared";
import { createApp } from "../src/app";
import { fixedClock } from "../src/lib/clock";
import { createEmployeeService } from "../src/services/employees";
import { createTestDb } from "./db";

const clock = fixedClock("2026-06-30");
let testDb: Awaited<ReturnType<typeof createTestDb>>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  testDb = await createTestDb();
  app = createApp({ db: testDb.db, clock, auth: "disabled" });
});
afterAll(() => testDb.close());

const people: EmployeeCreateInput[] = [
  {
    employeeCode: "EMP-00001",
    fullName: "-Zoë, O'Brien", // formula trigger, comma, accent, apostrophe
    email: "zoe@acme.test",
    jobTitle: "Software Engineer",
    department: "Engineering",
    countryCode: "GB",
    salaryAmount: 7_250_050,
    gender: "female",
    employmentType: "full_time",
    hireDate: "2021-01-04",
  },
  {
    employeeCode: "EMP-00002",
    fullName: "Kenji Sato",
    email: "kenji@acme.test",
    jobTitle: "QA Engineer",
    department: "Engineering",
    countryCode: "JP",
    salaryAmount: 9_000_000,
    gender: "male",
    employmentType: "contract",
    hireDate: "2023-05-01",
  },
];

beforeEach(async () => {
  await testDb.reset();
  const employees = createEmployeeService({ db: testDb.db, clock });
  for (const person of people) await employees.create(person);
});

const post = (path: string, body: string) =>
  app.request(`/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

/** What the browser does: parse the CSV, auto-map headers, build the request. */
function toImportRequest(csv: string): ImportRequest {
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: true,
  });
  const mapping = autoMapColumns(parsed.meta.fields ?? []);
  return {
    filename: "export.csv",
    rows: parsed.data.map((record, i) => ({
      line: i + 2,
      values: Object.fromEntries(
        Object.entries(mapping)
          .filter(([, header]) => header !== null)
          .map(([field, header]) => [field, unescapeCsvCell(record[header!] ?? "")]),
      ),
    })),
  };
}

describe("export", () => {
  it("downloads an Excel-friendly CSV", async () => {
    const res = await app.request("/api/export/employees.csv");
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    // Check bytes: Response.text() decodes UTF-8 and drops the BOM; Excel sees it.
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = new TextDecoder().decode(bytes);
    expect(csv).toContain(`"'-Zoë, O'Brien"`);
    expect(csv).not.toContain("female"); // gender is never exported
  });

  it("respects directory filters", async () => {
    const csv = await (await app.request("/api/export/employees.csv?country=JP")).text();
    expect(csv).toContain("Kenji Sato");
    expect(csv).not.toContain("Zoë");
  });

  it("round-trips: re-importing an untouched export changes nothing", async () => {
    const csv = await (await app.request("/api/export/employees.csv")).text();
    const res = await post("/imports/preview", JSON.stringify(toImportRequest(csv)));
    const preview = (await res.json()) as ImportPreview;
    expect(preview.summary).toEqual({ total: 2, create: 0, update: 0, unchanged: 2, error: 0 });
  });
});

describe("import routes", () => {
  it("serves a template that imports cleanly", async () => {
    const csv = await (await app.request("/api/imports/template.csv")).text();
    const preview = (await (
      await post("/imports/preview", JSON.stringify(toImportRequest(csv)))
    ).json()) as ImportPreview;
    expect(preview.summary).toMatchObject({ create: 2, error: 0 });
  });

  it("commits and lists the import", async () => {
    const csv = await (await app.request("/api/imports/template.csv")).text();
    const res = await post("/imports", JSON.stringify(toImportRequest(csv)));
    expect(res.status).toBe(201);
    const log = (await (await app.request("/api/imports")).json()) as unknown[];
    expect(log).toHaveLength(1);
  });

  it("rejects more than 10,000 rows (422) and oversized bodies (413)", async () => {
    const tooMany = {
      filename: "big.csv",
      rows: Array.from({ length: 10_001 }, (_, i) => ({ line: i + 2, values: {} })),
    };
    expect((await post("/imports/preview", JSON.stringify(tooMany))).status).toBe(422);

    const huge = JSON.stringify({ filename: "x.csv", padding: "x".repeat(4_500_000), rows: [] });
    expect((await post("/imports/preview", huge)).status).toBe(413);
  });
});
