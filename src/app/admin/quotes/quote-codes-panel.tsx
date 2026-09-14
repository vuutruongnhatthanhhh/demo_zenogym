"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { QuoteCode } from "@/lib/types";

export function QuoteCodesPanel({
  initialCodes,
  siteUrl,
}: {
  initialCodes: QuoteCode[];
  siteUrl: string;
}) {
  const [codes, setCodes] = useState(initialCodes);
  const [creating, setCreating] = useState(false);

  function linkFor(code: string) {
    return `${siteUrl}/bao-gia/${code}`;
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/quote-codes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setCodes((prev) => [data.code, ...prev]);
      await navigator.clipboard.writeText(linkFor(data.code.code));
      toast.success("Đã tạo mã báo giá mới và sao chép link");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(code: string) {
    await navigator.clipboard.writeText(linkFor(code));
    toast.success("Đã sao chép link");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Link báo giá riêng của tôi</CardTitle>
        <Button size="sm" onClick={handleCreate} disabled={creating}>
          <Plus className="mr-1 h-4 w-4" /> Tạo mã báo giá
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Gửi link này cho khách hàng. Yêu cầu báo giá gửi qua link này chỉ mình bạn thấy được.
        </p>
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có mã báo giá nào.</p>
        ) : (
          <div className="space-y-1.5">
            {codes.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{linkFor(c.code)}</p>
                  <p className="text-[11px] text-muted-foreground">Tạo lúc {formatDate(c.createdAt)}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyLink(c.code)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
