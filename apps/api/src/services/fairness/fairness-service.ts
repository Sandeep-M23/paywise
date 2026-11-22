import type {
  FairnessQuery,
  GenderGapGroup,
  PayOutlier,
  RaiseCost,
  RaiseCostRequest,
} from "@paywise/shared";
import type { Db } from "../../config/db";
import * as repo from "./fairness-repository";
import { raisePlanCost } from "../employees/raise-plans-repository";

const MIN_PEERS_FOR_OUTLIERS = 5;
const MIN_GROUP_SIZE = 5;
const GAP_THRESHOLD = 0.05;
const SIGNIFICANT_T = 1.96;

const num = (value: unknown) => Number(value);

export function createFairnessService({ db }: { db: Db }) {
  return {
    async outliers(filters: FairnessQuery): Promise<PayOutlier[]> {
      const rows = await repo.outlierRows(db, filters, MIN_PEERS_FOR_OUTLIERS);

      return rows.map((r) => {
        const amount = num(r.salary_amount);
        const median = num(r.median);
        return {
          id: String(r.id),
          employeeCode: String(r.employee_code),
          fullName: String(r.full_name),
          countryCode: String(r.country_code),
          jobTitle: String(r.job_title),
          department: String(r.department),
          salary: { amount, currency: String(r.salary_currency) },
          peerCount: num(r.n),
          peerMedian: Math.round(median),
          lowerFence: Math.round(num(r.lower_fence)),
          upperFence: Math.round(num(r.upper_fence)),
          direction: amount > median ? "above" : "below",
          deviation: Math.abs(amount - median) / median,
        };
      });
    },

    async genderGaps(filters: FairnessQuery): Promise<GenderGapGroup[]> {
      const rows = await repo.genderGapRows(db, filters);

      const groups = rows.map((r): GenderGapGroup => {
        const femaleCount = num(r.female_count);
        const maleCount = num(r.male_count);
        const base = {
          countryCode: String(r.country_code),
          jobTitle: String(r.job_title),
          currency: String(r.salary_currency),
          femaleCount,
          maleCount,
        };
        if (femaleCount < MIN_GROUP_SIZE || maleCount < MIN_GROUP_SIZE) {
          return {
            ...base,
            femaleMean: null,
            maleMean: null,
            femaleMedian: null,
            maleMedian: null,
            meanGap: null,
            medianGap: null,
            flagged: false,
            significant: false,
            suppressed: true,
          };
        }
        const femaleMean = num(r.female_mean);
        const maleMean = num(r.male_mean);
        const femaleMedian = num(r.female_median);
        const maleMedian = num(r.male_median);
        const meanGap = (maleMean - femaleMean) / maleMean;
        const medianGap = (maleMedian - femaleMedian) / maleMedian;
        const standardError = Math.sqrt(
          num(r.female_sd) ** 2 / femaleCount + num(r.male_sd) ** 2 / maleCount,
        );
        const significant =
          standardError === 0
            ? maleMean !== femaleMean
            : Math.abs(maleMean - femaleMean) / standardError >= SIGNIFICANT_T;
        return {
          ...base,
          femaleMean: Math.round(femaleMean),
          maleMean: Math.round(maleMean),
          femaleMedian: Math.round(femaleMedian),
          maleMedian: Math.round(maleMedian),
          meanGap,
          medianGap,
          flagged: Math.abs(meanGap) >= GAP_THRESHOLD,
          significant,
          suppressed: false,
        };
      });

      const rank = (g: GenderGapGroup) =>
        g.suppressed ? 3 : g.flagged && g.significant ? 0 : g.flagged ? 1 : 2;
      return groups.sort(
        (a, b) =>
          rank(a) - rank(b) ||
          Math.abs(b.meanGap ?? 0) - Math.abs(a.meanGap ?? 0) ||
          a.countryCode.localeCompare(b.countryCode) ||
          a.jobTitle.localeCompare(b.jobTitle),
      );
    },

    async raiseCost(plan: RaiseCostRequest): Promise<RaiseCost[]> {
      const rows = await raisePlanCost(db, plan);
      return rows.map((r) => ({
        currency: String(r.currency),
        headcount: num(r.headcount),
        currentTotal: num(r.current_total),
        increase: num(r.increase),
        newTotal: num(r.current_total) + num(r.increase),
      }));
    },
  };
}

export type FairnessService = ReturnType<typeof createFairnessService>;
