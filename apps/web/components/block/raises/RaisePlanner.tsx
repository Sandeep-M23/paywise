"use client";

import { useRaisePlan } from "@/hooks/useRaisePlan";
import { ApplyRaisesDialog } from "./ApplyRaisesDialog";
import { GroupRaiseCard } from "./GroupRaiseCard";
import { IndividualRaisesCard } from "./IndividualRaisesCard";
import { RaiseCostPanel } from "./RaiseCostPanel";

export function RaisePlanner() {
  const plan = useRaisePlan();

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex flex-col gap-4">
          <GroupRaiseCard group={plan.group} />
          <IndividualRaisesCard individuals={plan.individuals} />
        </div>
        <RaiseCostPanel estimate={plan.estimate} apply={plan.apply} />
      </div>
      <ApplyRaisesDialog estimate={plan.estimate} apply={plan.apply} />
    </>
  );
}
