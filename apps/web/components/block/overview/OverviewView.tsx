"use client";

import { EmployeeSheet } from "@/components/block/employees/EmployeeSheet";
import { Download } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useDownload } from "@/hooks/useDownload";
import { CountriesCard } from "./CountriesCard";
import { FurthestFromPeersCard } from "./FurthestFromPeersCard";
import { GapsToReviewCard } from "./GapsToReviewCard";
import { OverviewGreeting } from "./OverviewGreeting";
import { OverviewKpis } from "./OverviewKpis";

export function OverviewView() {
  const download = useDownload();

  return (
    <>
      <OverviewGreeting />
      <OverviewKpis />
      <div className="grid gap-4 lg:grid-cols-5">
        <CountriesCard />
        <div className="flex flex-col gap-4 lg:col-span-2">
          <GapsToReviewCard />
          <FurthestFromPeersCard />
        </div>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        Need the data in Excel?
        <Button
          variant="link"
          className="h-auto p-0"
          onClick={() => download("/export/employees.csv")}
        >
          <Download className="size-3.5" aria-hidden /> Export all active employees
        </Button>
      </div>

      <EmployeeSheet />
    </>
  );
}
