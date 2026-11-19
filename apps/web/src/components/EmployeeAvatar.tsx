import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\s-]/gu, "")
    .trim()
    .split(/[\s-]+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

export function EmployeeAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback className="bg-lime text-lime-foreground text-xs font-bold">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
