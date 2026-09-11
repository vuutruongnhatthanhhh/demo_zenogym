import Link from "next/link";
import { Dumbbell, FileText, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllProducts } from "@/lib/data/products";
import { getAllQuotes } from "@/lib/data/quotes";
import { formatCurrency, formatDate } from "@/lib/utils";

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

export default async function AdminDashboardPage() {
  const [products, quotes] = await Promise.all([getAllProducts(), getAllQuotes()]);
  const newCount = quotes.filter((q) => q.status === "new").length;
  const sentCount = quotes.filter((q) => q.status === "sent").length;

  const stats = [
    { label: "Sản phẩm đang bán", value: products.filter((p) => p.available).length, icon: Dumbbell },
    { label: "Yêu cầu báo giá", value: quotes.length, icon: FileText },
    { label: "Chờ xử lý", value: newCount, icon: Clock },
    { label: "Đã gửi báo giá", value: sentCount, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Số liệu nhanh về cửa hàng ZenoGym</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-accent p-2 text-accent-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu báo giá gần đây</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có yêu cầu báo giá nào.</p>
          ) : (
            quotes.slice(0, 8).map((q) => (
              <Link
                key={q.id}
                href={`/admin/quotes/${q.id}`}
                className="flex flex-col gap-1 rounded-md border p-3 text-sm transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {q.code} · {q.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(q.createdAt)} · {q.items.length} thiết bị
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
