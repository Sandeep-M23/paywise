import Link from "next/link";
import type { ImportResult } from "@paywise/shared";
import { CheckCircle2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DoneStep({ result, reset }: { result: ImportResult; reset: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <p className="text-lg font-medium">Import complete</p>
        <p className="text-muted-foreground text-sm">
          {result.created} added · {result.updated} updated · {result.unchanged} unchanged ·{" "}
          {result.skipped} skipped. Salary changes are recorded in each employee&apos;s history.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/employees">View employees</Link>
          </Button>
          <Button onClick={reset}>Import another file</Button>
        </div>
      </CardContent>
    </Card>
  );
}
