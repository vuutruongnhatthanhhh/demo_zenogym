import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly on navigation to any /admin/* route while its page
// component fetches data server-side, so clicking a sidebar link never
// feels stuck on the old page during the fetch.
export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
