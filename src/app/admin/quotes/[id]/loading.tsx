import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Shown instantly when clicking into a quote from /admin/quotes — that
// page's data fetch (quote + pricing + a legacy-category backfill for older
// quotes) can take a moment, so mirror the real layout here instead of
// relying on the generic /admin/loading.tsx fallback.
export default function AdminQuoteDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
