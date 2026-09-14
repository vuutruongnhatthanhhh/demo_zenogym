import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getAllQuotes } from "@/lib/data/quotes";
import { getQuoteCodesByAdmin } from "@/lib/data/quote-codes";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { usdToVnd } from "@/lib/pricing";
import { formatVND, formatDate } from "@/lib/utils";
import { QuoteCodesPanel } from "./quote-codes-panel";

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
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  const [quotes, codes, pricingSettings] = await Promise.all([
    getAllQuotes(user.id, user.isSuperAdmin),
    getQuoteCodesByAdmin(user.id),
    getPricingSettings(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Yêu cầu báo giá</h1>
        <p className="text-sm text-muted-foreground">{quotes.length} yêu cầu bạn có thể xem</p>
      </div>

      <QuoteCodesPanel initialCodes={codes} siteUrl={process.env.NEXT_PUBLIC_URL ?? ""} />

      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có yêu cầu báo giá nào.</p>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => {
            const retailTotalUsd = q.items.reduce((s, i) => s + i.price * i.quantity, 0);
            const previewTotal =
              q.quotedTotal ?? usdToVnd(retailTotalUsd, pricingSettings.usdToVndRate);
            return (
              <Link key={q.id} href={`/admin/quotes/${q.id}`}>
                <Card className="transition-colors hover:bg-accent/30">
                  <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {q.code} · {q.customerName}
                        {q.linkCode ? (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Link riêng
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {q.customerPhone} · {q.customerEmail}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(q.createdAt)} · {q.items.length} thiết bị · Tạm tính{" "}
                        {formatVND(previewTotal)}
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
