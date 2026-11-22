import type { ImportStep } from "@/@types";

const STEPS = ["Upload", "Match columns", "Review", "Done"] as const;
const ORDER: ImportStep[] = ["upload", "map", "preview", "done"];

export function ImportSteps({ step }: { step: ImportStep }) {
  const stepIndex = ORDER.indexOf(step);
  return (
    <ol className="flex flex-wrap gap-2 text-sm" aria-label="Import steps">
      {STEPS.map((label, i) => (
        <li
          key={label}
          aria-current={i === stepIndex ? "step" : undefined}
          className={
            i === stepIndex
              ? "bg-primary text-primary-foreground rounded-md px-3 py-1"
              : i < stepIndex
                ? "bg-muted rounded-md px-3 py-1"
                : "text-muted-foreground rounded-md border px-3 py-1"
          }
        >
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}
