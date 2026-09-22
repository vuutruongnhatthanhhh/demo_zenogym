import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerQuotes } from "@/lib/data/quotes";
import { formatDate, formatVND } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  new: "Yêu cầu mới",
  quoted: "Đã tạo báo giá",
  sent: "Đã gửi báo giá",
};

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "success"> = {
  new: "secondary",
  quoted: "outline",
  sent: "success",
};

export default async function CustomerQuotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const quotes = await getCustomerQuotes(user.id);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-primary">Yêu cầu báo giá của tôi</h1>
          <p className="text-sm text-muted-foreground">{quotes.length} yêu cầu đã gửi</p>
        </div>

        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bạn chưa gửi yêu cầu báo giá nào.</p>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <Card key={q.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{q.code}</p>
                        {q.requestCount > 1 ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            Đã gửi {q.requestCount} lần
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(q.createdAt)} · {q.items.length} thiết bị
                        {q.quotedTotal ? ` · Báo giá ${formatVND(q.quotedTotal)}` : ""}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[q.status]} className="whitespace-nowrap">
                      {STATUS_LABEL[q.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {q.status === "sent" ? (
                      <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                        <a href={`/api/quotes/${q.id}/customer-pdf`} target="_blank" rel="noreferrer">
                          <Download className="mr-1 h-3.5 w-3.5" /> Xem báo giá (PDF)
                        </a>
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                      <Link href={`/account/quotes/${q.id}`}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Chỉnh sửa & gửi lại
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
