"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { QuoteRequest } from "@/lib/types";

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

export function QuotesListClient({ initialQuotes }: { initialQuotes: QuoteRequest[] }) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(quote: QuoteRequest) {
    if (
      !confirm(
        `Xoá yêu cầu báo giá "${quote.code}" của ${quote.customerName}? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }
    setDeletingId(quote.id);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Xoá thất bại");
      setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
      toast.success("Đã xoá yêu cầu báo giá");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setDeletingId(null);
    }
  }

  if (quotes.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có yêu cầu báo giá nào.</p>;
  }

  return (
    <div className="space-y-2">
      {quotes.map((q) => (
        <Card key={q.id} className="transition-colors hover:bg-accent/30">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href={`/admin/quotes/${q.id}`} className="min-w-0 flex-1">
              <p className="font-semibold">
                {q.code} · {q.customerName}
                {q.linkCode ? (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Link riêng
                  </Badge>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {q.customerEmail ? `${q.customerPhone} · ${q.customerEmail}` : q.customerPhone}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(q.createdAt)} · {q.items.length} thiết bị
              </p>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge>
              <Button
                variant="ghost"
                size="icon"
                disabled={deletingId === q.id}
                onClick={() => handleDelete(q)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Xoá yêu cầu báo giá"
              >
                {deletingId === q.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
