"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AlertTriangle } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenderGaps } from "@/utils/apis/fairness";
import { gapKind } from "@/utils/helpers/fairness";
import { countryName, percent } from "@/utils/helpers/others/format";

export function GapsToReviewCard() {
  const gaps = useGenderGaps({});
  const review = gaps.data?.filter((g) => gapKind(g) === "review") ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" aria-hidden /> Gender gaps to review
        </CardTitle>
        <CardDescription>Largest first. Women paid less shows as a positive gap.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {gaps.isLoading &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-2 py-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
          ))}
        {gaps.data && review.length === 0 && (
          <p className="text-muted-foreground text-sm">Nothing needs review. 🎉</p>
        )}
        {review.slice(0, 4).map((g) => (
          <Link
            key={`${g.countryCode}-${g.jobTitle}`}
            href="/fairness"
            className="hover:bg-muted flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm"
          >
            <span className="min-w-0 truncate">
              {g.jobTitle}{" "}
              <span className="text-muted-foreground">· {countryName(g.countryCode)}</span>
            </span>
            <Badge variant="outline" className="tabular-nums">
              {g.meanGap! > 0 ? "+" : ""}
              {percent(g.meanGap!)}
            </Badge>
          </Link>
        ))}
        {review.length > 4 && (
          <Link
            href="/fairness"
            className="text-link flex items-center gap-1 px-2 text-sm font-semibold hover:underline"
          >
            See all {review.length} <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
