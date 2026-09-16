import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Shown instantly when clicking "Chỉnh sửa & gửi lại" from /account/quotes —
// this page re-fetches the full product catalog plus the saved request
// before it can render, so mirror the catalog layout here instead of
// leaving the click feeling stuck.
export default function EditCustomerQuoteLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Skeleton className="mb-4 h-9 w-full max-w-xs" />

        <div className="mb-2 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>

        <Skeleton className="mb-4 h-12 w-full" />

        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Skeleton className="h-11 w-48" />
        </div>
      </div>
    </div>
  );
}
