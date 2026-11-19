import type { Money } from "./money";
import type { CountryCode } from "./countries";
import type { EmployeeStatus, EmploymentType, Gender, RevisionReason } from "./schemas";

/** API response shapes, shared so the web app and API agree on them at compile time. */

export type EmployeeSummary = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: CountryCode;
  salary: Money;
  employmentType: EmploymentType;
  hireDate: string;
  status: EmployeeStatus;
};

/**
 * historical: superseded by a later date · current: in force today · scheduled:
 * takes effect later · corrected: replaced by a correction on the same date ·
 * cancelled: a scheduled change that won't happen.
 */
export type RevisionState = "historical" | "current" | "scheduled" | "corrected" | "cancelled";

export type SalaryRevision = {
  id: string;
  amount: number;
  /** The amount in force just before this date (derived), null for the first. */
  previousAmount: number | null;
  currency: string;
  effectiveOn: string;
  reason: RevisionReason;
  note: string | null;
  importId: string | null;
  correctsRevisionId: string | null;
  state: RevisionState;
  createdBy: string;
  createdAt: string;
};

export type EmployeeDetail = EmployeeSummary & {
  gender: Gender;
  deactivatedAt: string | null;
  deactivationReason: string | null;
  revisions: SalaryRevision[];
};

export type Page<T> = { data: T[]; page: number; pageSize: number; total: number };

export type ApiErrorBody = {
  error: { code: string; message: string; details?: { path: string; message: string }[] };
};

/** Insight figures are minor units in the country's own currency. */
export type PayStats = {
  headcount: number;
  min: number;
  max: number;
  mean: number;
  median: number;
};

export type CountrySummary = PayStats & { countryCode: string; currency: string; total: number };
export type JobTitleSummary = PayStats & { jobTitle: string };
export type DepartmentSummary = Omit<PayStats, "min" | "max"> & {
  department: string;
  total: number;
};
export type DistributionBucket = { from: number; to: number; count: number };
export type Distribution = { currency: string; buckets: DistributionBucket[] };

export type FilterOptions = {
  countries: { code: CountryCode; name: string; currency: string }[];
  jobTitles: string[];
  departments: string[];
};

export type ImportRowStatus = "create" | "update" | "unchanged" | "error";
export type ImportChange = { field: string; from: string | number; to: string | number };

export type ImportPreviewRow = {
  line: number;
  employeeCode: string | null;
  fullName: string | null;
  status: ImportRowStatus;
  currency?: string;
  errors?: { field: string; message: string }[];
  changes?: ImportChange[];
};

export type ImportPreview = {
  summary: Record<ImportRowStatus, number> & { total: number };
  rows: ImportPreviewRow[];
};

export type ImportResult = {
  importId: string;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
};

export type ImportLogEntry = {
  id: string;
  filename: string;
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  status: "committed" | "reverted";
  createdBy: string | null;
  createdAt: string;
};

/** An import with what each created, updated or skipped row did. */
export type ImportDetail = ImportLogEntry & { rows: ImportPreviewRow[] };

export type PayOutlier = {
  id: string;
  employeeCode: string;
  fullName: string;
  countryCode: string;
  jobTitle: string;
  department: string;
  salary: Money;
  peerCount: number;
  peerMedian: number;
  lowerFence: number;
  upperFence: number;
  direction: "above" | "below";
  /** Distance from the peer median as a fraction of it (0.5 = 50% above). */
  deviation: number;
};

/** Values are null when a group is too small to report without identifying people. */
export type GenderGapGroup = {
  countryCode: string;
  jobTitle: string;
  currency: string;
  femaleCount: number;
  maleCount: number;
  femaleMean: number | null;
  maleMean: number | null;
  femaleMedian: number | null;
  maleMedian: number | null;
  meanGap: number | null;
  medianGap: number | null;
  /** Mean gap of 5% or more either way (EU Pay Transparency Directive trigger). */
  flagged: boolean;
  /** Welch t-test at ~95%: the gap is unlikely to be chance. */
  significant: boolean;
  suppressed: boolean;
};

/** `scheduled`: how many of the applied revisions take effect in the future. */
export type RaiseApplyResult = { applied: number; skipped: number; scheduled: number };

export type RaiseCost = {
  currency: string;
  headcount: number;
  currentTotal: number;
  increase: number;
  newTotal: number;
};
