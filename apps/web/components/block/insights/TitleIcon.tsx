import type { AppIcon } from "@/@types";

export function TitleIcon({ icon: Icon }: { icon: AppIcon }) {
  return (
    <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full">
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
