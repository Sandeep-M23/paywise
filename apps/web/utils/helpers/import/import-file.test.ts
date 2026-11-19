import { describe, expect, it } from "vitest";
import { autoMapColumns } from "@paywise/shared";
import { buildImportRequest, errorReportCsv, parseCsvText } from "./import-file";

const csv = [
  "\uFEFFEmp ID,Name,Email,Designation,Dept,Country,CTC,Type,DOJ",
  'EMP-1,Asha Rao,asha@acme.test,Analyst,Data,India,"18,00,000",Full-time,2024-04-01',
  "",
  "EMP-2,'-Tom,tom@acme.test,Analyst,Data,DE,65000,Full-time,2024-04-01",
].join("\r\n");

describe("parseCsvText", () => {
  it("reads headers, drops blank lines, and keeps spreadsheet line numbers", () => {
    const { headers, records } = parseCsvText(csv);
    expect(headers[0]).toBe("Emp ID");
    expect(records.map((r) => r.line)).toEqual([2, 4]);
    expect(records[0]!.values.CTC).toBe("18,00,000");
  });

  it("rejects files without data", () => {
    expect(() => parseCsvText("a,b\r\n")).toThrow(/no data rows/);
  });
});

describe("buildImportRequest", () => {
  it("applies the column mapping and reverses the export formula guard", () => {
    const { headers, records } = parseCsvText(csv);
    const request = buildImportRequest("f.csv", records, autoMapColumns(headers));
    expect(request.rows[0]).toEqual({
      line: 2,
      values: {
        employeeCode: "EMP-1",
        fullName: "Asha Rao",
        email: "asha@acme.test",
        jobTitle: "Analyst",
        department: "Data",
        countryCode: "India",
        salary: "18,00,000",
        employmentType: "Full-time",
        hireDate: "2024-04-01",
      },
    });
    expect(request.rows[1]!.values.fullName).toBe("-Tom");
  });
});

describe("errorReportCsv", () => {
  it("returns failed rows as uploaded with an explanation column", () => {
    const { headers, records } = parseCsvText(csv);
    const report = errorReportCsv(headers, records, [
      { line: 2, employeeCode: "EMP-1", fullName: "Asha Rao", status: "create" },
      {
        line: 4,
        employeeCode: "EMP-2",
        fullName: "-Tom",
        status: "error",
        errors: [{ field: "salary", message: "Too low" }],
      },
    ]);
    const lines = report
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/,paywise_errors$/);
    expect(lines[1]).toMatch(/^EMP-2,/);
    expect(lines[1]).toMatch(/salary: Too low$/);
  });
});
