import type { ReactNode } from "react";
import type { GenderGapGroup } from "@paywise/shared";
import type { AppIcon, FairnessTab } from "@/@types";
import {
  AlertTriangle,
  BookOpen,
  CircleHelp,
  EyeOff,
  Scale,
  TrendingUp,
  Users,
} from "@/components/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GapStatus } from "./GapStatus";

export function FairnessGuide({
  view,
  explaining,
  setExplaining,
}: {
  view: FairnessTab;
  explaining: boolean;
  setExplaining: (open: boolean) => void;
}) {
  return (
    <Sheet open={explaining} onOpenChange={setExplaining}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="size-5" aria-hidden /> How to read this
          </SheetTitle>
          <SheetDescription>
            What the numbers on Pay fairness mean, and what to do about them.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-4">
          {view === "gender" ? (
            <>
              <GapExplainer />
              <OutlierExplainer />
            </>
          ) : (
            <>
              <OutlierExplainer />
              <GapExplainer />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GapExplainer() {
  const sample = (patch: Partial<GenderGapGroup>): GenderGapGroup => ({
    countryCode: "",
    jobTitle: "",
    currency: "",
    femaleCount: 0,
    maleCount: 0,
    femaleMean: null,
    maleMean: null,
    femaleMedian: null,
    maleMedian: null,
    meanGap: null,
    medianGap: null,
    flagged: false,
    significant: false,
    suppressed: false,
    ...patch,
  });
  return (
    <Explainer
      title="Gender pay gap"
      points={[
        {
          icon: Scale,
          title: "The gap",
          text: "How much less women earn than men, on average, in the same job and country. 10% means women earn 10% less; a negative gap means women earn more.",
        },
        {
          icon: AlertTriangle,
          title: "The 5% line",
          text: "5% is a common reporting threshold (the EU Pay Transparency Directive uses it). A gap here is a statistical indicator, not a finding: it can reflect tenure, level or performance, which Paywise doesn't record, and it isn't evidence of discrimination.",
        },
        {
          icon: CircleHelp,
          title: "Chance or real?",
          text: "In small groups a big gap can be luck. “Potential disparity” means a statistical test says it is unlikely to be chance.",
        },
        {
          icon: EyeOff,
          title: "Privacy",
          text: "Only full-time employees are compared. Groups with fewer than 5 women or 5 men are hidden so no one can be identified.",
        },
      ]}
      legend={[
        {
          badge: <GapStatus group={sample({ flagged: true, significant: true })} />,
          text: "Look at this group first",
        },
        {
          badge: <GapStatus group={sample({ flagged: true })} />,
          text: "Keep an eye on it as the group grows",
        },
        { badge: <GapStatus group={sample({})} />, text: "No action needed" },
        { badge: <GapStatus group={sample({ suppressed: true })} />, text: "Hidden for privacy" },
      ]}
    />
  );
}

function OutlierExplainer() {
  return (
    <Explainer
      title="Outliers"
      points={[
        {
          icon: Users,
          title: "Peers",
          text: "Everyone with the same job title in the same country. Groups need at least 5 people.",
        },
        {
          icon: TrendingUp,
          title: "Outlier",
          text: "A salary outside 1.5× the interquartile range of the peer group: the usual Excel and statistics rule for unusual values.",
        },
        {
          icon: Scale,
          title: "Difference",
          text: "How far the salary is from the peer median. ▲ 40% above means 40% more than the typical peer.",
        },
        {
          icon: CircleHelp,
          title: "What to do",
          text: "Worth a look, not necessarily wrong: seniority or a typo can both explain it. Click a row to open the record.",
        },
      ]}
    />
  );
}

function Explainer({
  title,
  points,
  legend,
}: {
  title: string;
  points: { icon: AppIcon; title: string; text: string }[];
  legend?: { badge: ReactNode; text: string }[];
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      <ul className="flex flex-col gap-4">
        {points.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="text-sm">
              <p className="font-semibold">{title}</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      {legend && (
        <div className="bg-muted flex flex-col gap-2.5 rounded-lg p-3 text-xs">
          <p className="font-semibold">What the status means</p>
          {legend.map(({ badge, text }) => (
            <span key={text} className="flex items-center justify-between gap-3">
              {badge}
              <span className="text-muted-foreground text-right">{text}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
