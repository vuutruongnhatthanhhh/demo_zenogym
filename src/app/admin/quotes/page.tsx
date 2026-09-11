import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAllQuotes } from "@/lib/data/quotes";
import { formatUSD, formatDate } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  new: "Yêu cầu mới",
  quoted: "Đã tạo báo giá",
  sent: "Đã gửi khách",
};

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "success"> = {
  new: "secondary",
  quoted: "outline",
  sent: "success",
};

export default async function AdminQuotesPage() {
  const quotes = await getAllQuotes();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Yêu cầu báo giá</h1>
        <p className="text-sm text-muted-foreground">{quotes.length} yêu cầu từ khách hàng</p>
      </div>

      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có yêu cầu báo giá nào.</p>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => {
            const retailTotal = q.items.reduce((s, i) => s + i.price * i.quantity, 0);
            return (
              <Link key={q.id} href={`/admin/quotes/${q.id}`}>
                <Card className="transition-colors hover:bg-accent/30">
                  <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {q.code} · {q.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {q.customerPhone} · {q.customerEmail}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(q.createdAt)} · {q.items.length} thiết bị · Tạm tính{" "}
                        {formatUSD(q.quotedTotal ?? retailTotal)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
