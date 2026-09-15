"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuoteCodesPanel({ code, siteUrl }: { code: string; siteUrl: string }) {
  const link = `${siteUrl}/bao-gia/${code}`;

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    toast.success("Đã sao chép link");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Link báo giá riêng của tôi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Gửi link này cho khách hàng. Yêu cầu báo giá gửi qua link này chỉ mình bạn thấy được.
        </p>
        <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
          <p className="min-w-0 truncate font-mono text-xs">{link}</p>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
