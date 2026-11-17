import { describe, expect, it } from "vitest";
import {
  autoMapColumns,
  employeeToCsvRecord,
  EXPORT_HEADERS,
  parseImportRow,
  toCsv,
  unescapeCsvCell,
  escapeCsvCell,
} from "./csv";

describe("autoMapColumns", () => {
  it("matches common header spellings to fields", () => {
    const mapping = autoMapColumns([
      "Emp ID",
      "Employee Name",
      "E-mail",
      "Designation",
      "Dept",
      "Country",
      "Annual Salary",
      "Employment Type",
      "Date of Joining",
      "Gender",
    ]);
    expect(mapping).toEqual({
      employeeCode: "Emp ID",
      fullName: "Employee Name",
      email: "E-mail",
      jobTitle: "Designation",
      department: "Dept",
      countryCode: "Country",
      salary: "Annual Salary",
      employmentType: "Employment Type",
      hireDate: "Date of Joining",
      gender: "Gender",
    });
  });

  it("prefers the most specific header, leaves unknown fields unmapped, never reuses a header", () => {
    const mapping = autoMapColumns(["Name", "Full Name", "Notes"]);
    expect(mapping.fullName).toBe("Full Name");
    expect(mapping.email).toBeNull();
    const used = Object.values(mapping).filter((h) => h !== null);
    expect(new Set(used).size).toBe(used.length);
  });

  it("maps our own export headers back to fields", () => {
    const mapping = autoMapColumns([...EXPORT_HEADERS]);
    expect(mapping.gender).toBeNull(); // gender is never exported
    expect(mapping).toMatchObject({ employeeCode: "employee_code", salary: "salary" });
  });
});

describe("parseImportRow", () => {
  const row = {
    employeeCode: "emp-00042",
    fullName: " Priya Sharma ",
    email: "Priya@ACME.test",
    jobTitle: "Software Engineer",
    department: "Engineering",
    countryCode: "India",
    salary: "₹18,00,000",
    employmentType: "Full-time",
    hireDate: "2022-04-01",
  };

  it("normalises a spreadsheet row into a valid employee", () => {
    expect(parseImportRow(row)).toEqual({
      ok: true,
      value: {
        employeeCode: "EMP-00042",
        fullName: "Priya Sharma",
        email: "priya@acme.test",
        jobTitle: "Software Engineer",
        department: "Engineering",
        countryCode: "IN",
        salaryAmount: 180_000_000,
        employmentType: "full_time",
        hireDate: "2022-04-01",
      },
    });
  });

  it("parses salary in the country's currency (zero-decimal JPY)", () => {
    const result = parseImportRow({ ...row, countryCode: "JP", salary: "9,000,000" });
    expect(result).toMatchObject({ ok: true, value: { salaryAmount: 9_000_000 } });
  });

  it("keeps gender optional but validates it when present", () => {
    const without = parseImportRow(row);
    expect(without.ok && "gender" in without.value).toBe(false);
    expect(parseImportRow({ ...row, gender: "F" })).toMatchObject({
      ok: true,
      value: { gender: "female" },
    });
    expect(parseImportRow({ ...row, gender: "maybe" })).toMatchObject({ ok: false });
  });

  it("reports every problem with the field it belongs to", () => {
    const result = parseImportRow({
      ...row,
      email: "not-an-email",
      salary: "twelve lakh",
      hireDate: "01/04/2022",
      employmentType: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field).sort()).toEqual([
        "email",
        "employmentType",
        "hireDate",
        "salary",
      ]);
    }
  });

  it("explains that salary needs a valid country", () => {
    const result = parseImportRow({ ...row, countryCode: "Atlantis" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "countryCode" }),
          expect.objectContaining({ field: "salary", message: expect.stringMatching(/country/i) }),
        ]),
      );
    }
  });

  it("reports missing required fields", () => {
    const result = parseImportRow({ fullName: "Only A Name" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(7);
  });
});

describe("csv export", () => {
  it("neutralises cells that spreadsheets would run as formulas", () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("-1")).toBe("'-1");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("Priya")).toBe("Priya");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsvCell("Sharma, Priya")).toBe('"Sharma, Priya"');
    expect(escapeCsvCell('6" tall')).toBe('"6"" tall"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("starts with a UTF-8 BOM and uses CRLF line endings for Excel", () => {
    const csv = toCsv(["name"], [["José"]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toBe("\uFEFFname\r\nJosé\r\n");
  });

  it("round-trips: an exported employee imports back to the same values", () => {
    const record = employeeToCsvRecord({
      employeeCode: "EMP-00001",
      fullName: "-Zoë O'Brien",
      email: "zoe@acme.test",
      jobTitle: "Software Engineer",
      department: "Engineering",
      countryCode: "IN",
      salary: { amount: 180_000_050, currency: "inr" },
      employmentType: "part_time",
      hireDate: "2022-04-01",
      status: "active",
    });
    const mapping = autoMapColumns([...EXPORT_HEADERS]);
    const row = Object.fromEntries(
      Object.entries(mapping)
        .filter(([, header]) => header !== null)
        .map(([field, header]) => [
          field,
          unescapeCsvCell(
            record[EXPORT_HEADERS.indexOf(header as (typeof EXPORT_HEADERS)[number])]!,
          ),
        ]),
    );
    expect(parseImportRow(row)).toMatchObject({
      ok: true,
      value: { fullName: "-Zoë O'Brien", salaryAmount: 180_000_050, employmentType: "part_time" },
    });
  });
});
