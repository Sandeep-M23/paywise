"use client";

import { Users } from "@/components/icons";
import { Card, CardContent } from "@/components/ui/card";
import type { RaisePlan } from "@/hooks/useRaisePlan";
import { EmployeeSearch } from "./EmployeeSearch";
import { IndividualRow } from "./IndividualRow";
import { StepHeader } from "./StepHeader";

export function IndividualRaisesCard({ individuals }: { individuals: RaisePlan["individuals"] }) {
  return (
    <Card>
      <StepHeader
        step={2}
        title="Individual raises"
        description="A custom % or a new salary for specific people. It replaces the group raise for them."
        aside={
          individuals.list.length > 0 ? (
            <span className="bg-lime text-lime-foreground rounded-md px-2 py-0.5 text-xs font-bold tabular-nums">
              {individuals.list.length}
            </span>
          ) : undefined
        }
      />
      <CardContent className="flex flex-col gap-3">
        <EmployeeSearch
          exclude={individuals.list.map((i) => i.employee.id)}
          onPick={individuals.add}
        />
        {individuals.list.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-1 rounded-lg border border-dashed py-6 text-center text-sm">
            <Users className="size-6 opacity-60" aria-hidden />
            Nobody yet. Search above to add a person.
          </div>
        ) : (
          <ul className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto">
            {individuals.list.map((individual, index) => (
              <IndividualRow
                key={individual.employee.id}
                individual={individual}
                result={individuals.overrides[index]!}
                onChange={(patch) => individuals.update(individual.employee.id, patch)}
                onRemove={() => individuals.remove(individual.employee.id)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
