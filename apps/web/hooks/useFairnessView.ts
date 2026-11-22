"use client";

import { useState } from "react";
import type { FairnessTab, GapFilter } from "@/@types";
import { useGenderGaps, useOutliers } from "@/utils/apis/fairness";
import { gapKind } from "@/utils/helpers/fairness";

export function useFairnessView() {
  const [view, setView] = useState<FairnessTab>("gender");
  const [countries, setCountries] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [directions, setDirections] = useState<string[]>([]);
  const [explaining, setExplaining] = useState(false);
  const gaps = useGenderGaps({});
  const outliers = useOutliers({});

  const inScope = <T extends { jobTitle: string; countryCode: string }>(rows: T[] | undefined) =>
    (rows ?? []).filter(
      (r) =>
        (countries.length === 0 || countries.includes(r.countryCode)) &&
        (titles.length === 0 || titles.includes(r.jobTitle)),
    );
  const groups = inScope(gaps.data);
  const shownGroups = groups.filter((g) => kinds.length === 0 || kinds.includes(gapKind(g)));
  const people = inScope(outliers.data);
  const shownPeople = people.filter(
    (o) => directions.length === 0 || directions.includes(o.direction),
  );
  const count = (kind: Exclude<GapFilter, "all">) =>
    groups.filter((g) => gapKind(g) === kind).length;
  const anyFilter =
    countries.length + titles.length + (view === "gender" ? kinds : directions).length > 0;

  return {
    view,
    setView,
    countries,
    setCountries,
    titles,
    setTitles,
    kinds,
    setKinds,
    directions,
    setDirections,
    explaining,
    setExplaining,
    gaps,
    outliers,
    groups,
    shownGroups,
    people,
    shownPeople,
    count,
    anyFilter,
  };
}
