"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RaisePlan } from "@/hooks/useRaisePlan";
import { humanize, money } from "@/utils/helpers/others/format";

export function ApplyRaisesDialog({
  estimate: { cost, people },
  apply: { effectiveOn, reason, confirming, setConfirming, applying, run },
}: {
  estimate: RaisePlan["estimate"];
  apply: RaisePlan["apply"];
}) {
  return (
    <Dialog open={confirming} onOpenChange={setConfirming}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply raises to {people.toLocaleString()} people?</DialogTitle>
          <DialogDescription>
            This saves a salary change for each person, effective {effectiveOn}, reason “
            {humanize(reason)}”. It is all or nothing: if any person can’t be changed, nobody is.
            Mistakes are fixed later with a correction.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1 text-sm">
          {cost?.map((row) => (
            <li key={row.currency} className="flex justify-between tabular-nums">
              <span>
                {row.currency.toUpperCase()} · {row.headcount.toLocaleString()} people
              </span>
              <span className="font-semibold">
                +{money(row.increase, row.currency, undefined, "none")} / year
              </span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button onClick={run} disabled={applying}>
            {applying ? "Applying…" : "Apply raises"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
