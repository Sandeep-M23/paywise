import Papa from "papaparse";
import { autoMapColumns, unescapeCsvCell, type ImportRequest } from "@paywise/shared";

const base = process.env.BASE_URL ?? "http://localhost:4000";
const runs = 7;
let token = "";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base}/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
}

async function time(label: string, fn: () => Promise<unknown>, times = runs) {
  const samples: number[] = [];
  for (let i = 0; i < times; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length / 2)]!;
  console.log(
    `${label.padEnd(44)} p50 ${p50.toFixed(0).padStart(5)} ms   max ${samples.at(-1)!.toFixed(0).padStart(5)} ms`,
  );
}

const login = await call("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: process.env.HR_EMAIL, password: process.env.HR_PASSWORD }),
});
token = ((await login.json()) as { data: { authToken: string } }).data.authToken;

await time("List page 1 (25 rows, default sort)", () => call("/employees"));
await time("List sorted by salary, page 200", () =>
  call("/employees?sort=salaryAmount&order=desc&page=200"),
);
await time("List filtered (IN, Engineering)", () =>
  call("/employees?country=IN&department=Engineering"),
);
await time("Search 'shar'", () => call("/employees?q=shar"));
await time("Country summaries (all countries)", () => call("/insights/countries"));
await time("Job titles (IN)", () => call("/insights/countries/IN/job-titles"));
await time("Distribution (IN)", () => call("/insights/countries/IN/distribution?buckets=12"));
await time("Gender gaps (all)", () => call("/insights/fairness/gender-gaps"));
await time("Outliers (all)", () => call("/insights/fairness/outliers"));
await time("Raise cost (IN, 5%)", () =>
  call("/insights/raise-cost", {
    method: "POST",
    body: JSON.stringify({ percent: 5, country: "IN" }),
  }),
);

let csv = "";
await time(
  "Export all employees (CSV)",
  async () => (csv = await (await call("/export/employees.csv")).text()),
  3,
);

const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
const mapping = autoMapColumns(parsed.meta.fields ?? []);
const request: ImportRequest = {
  filename: "measure.csv",
  rows: parsed.data
    .filter((r) => r.status === "active")
    .slice(0, 10_000)
    .map((record, i) => ({
      line: i + 2,
      values: Object.fromEntries(
        Object.entries(mapping)
          .filter(([, h]) => h)
          .map(([field, h]) => [field, unescapeCsvCell(record[h!] ?? "")]),
      ),
    })),
};
const body = JSON.stringify(request);
console.log(`Import file: ${request.rows.length} rows, ${(body.length / 1e6).toFixed(2)} MB JSON`);
await time(
  `Import preview (${request.rows.length} rows)`,
  () => call("/imports/preview", { method: "POST", body }),
  3,
);

if (process.argv.includes("--commit")) {
  for (const row of request.rows) {
    const amount = Number(row.values.salary);
    row.values.salary = Math.round(amount * 1.03).toString();
  }
  const raiseBody = JSON.stringify({ ...request, filename: "measure-raise.csv" });
  await time(
    `Import commit (${request.rows.length} updates)`,
    () => call("/imports", { method: "POST", body: raiseBody }),
    1,
  );
}
