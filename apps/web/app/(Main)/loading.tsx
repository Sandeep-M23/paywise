import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl md:h-auto md:min-h-0 md:flex-1" />
    </>
  );
}
