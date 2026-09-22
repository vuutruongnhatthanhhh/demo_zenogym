import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Shown instantly when clicking "Chỉnh sửa & gửi lại" from /account/quotes —
// mirrors the edit-quote layout (selected-products card + note + submit)
// instead of leaving the click feeling stuck while data loads.
export default function EditCustomerQuoteLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-4 w-20" />

        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-32" />
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>

        <Skeleton className="h-20 w-full" />

        <div className="flex justify-end">
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    </div>
  );
}
