"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { QuoteLineItem, QuoteRequest } from "@/lib/types";

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

function buildInitialLines(quote: QuoteRequest): QuoteLineItem[] {
  if (quote.quotedItems && quote.quotedItems.length > 0) return quote.quotedItems;
  return quote.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    image: item.image,
    quantity: item.quantity,
    unitPrice: item.projectPrice,
  }));
}

export function QuoteDetailClient({ quote: initialQuote }: { quote: QuoteRequest }) {
  const [quote, setQuote] = useState(initialQuote);
  const [lines, setLines] = useState<QuoteLineItem[]>(() => buildInitialLines(initialQuote));
  const [note, setNote] = useState(initialQuote.quotedNote ?? "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  function updateLine(index: number, patch: Partial<QuoteLineItem>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function applyPreset(index: number, price: number) {
    updateLine(index, { unitPrice: price });
  }

  async function handleSaveDraft() {
    if (lines.length === 0) {
      toast.error("Danh sách sản phẩm trống");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, note }),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      const data = await res.json();
      setQuote(data.quote);
      toast.success("Đã lưu báo giá nháp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (lines.length === 0) {
      toast.error("Danh sách sản phẩm trống");
      return;
    }
    const confirmed = confirm(
      `Gửi báo giá PDF qua email cho ${quote.customerEmail}?\nTổng tiền: ${formatCurrency(total)}`
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Gửi báo giá thất bại");
      }
      const data = await res.json();
      setQuote(data.quote);
      toast.success("Đã gửi báo giá PDF cho khách hàng qua email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/quotes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{quote.code}</h1>
          <p className="text-sm text-muted-foreground">Tạo lúc {formatDate(quote.createdAt)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[quote.status]}>{STATUS_LABEL[quote.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Họ tên: </span>{quote.customerName}</p>
          <p><span className="text-muted-foreground">Điện thoại: </span>{quote.customerPhone}</p>
          <p><span className="text-muted-foreground">Email: </span>{quote.customerEmail}</p>
          {quote.companyName ? (
            <p><span className="text-muted-foreground">Công ty: </span>{quote.companyName}</p>
          ) : null}
          {quote.note ? (
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Ghi chú của khách: </span>
              {quote.note}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chỉnh sửa báo giá</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, idx) => {
            const original = quote.items.find((i) => i.productId === line.productId);
            return (
              <div key={`${line.productId}-${idx}`} className="rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
                    <Image src={line.image} alt={line.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">SL</Label>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })
                          }
                          className="h-8 w-16"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Đơn giá báo khách</Label>
                        <Input
                          type="number"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })}
                          className="h-8 w-36"
                        />
                      </div>
                      {original ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => applyPreset(idx, original.projectPrice)}
                            className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-accent"
                          >
                            Giá dự án {formatCurrency(original.projectPrice)}
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPreset(idx, original.retailPrice)}
                            className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-accent"
                          >
                            Giá bán lẻ {formatCurrency(original.retailPrice)}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm font-semibold">{formatCurrency(line.unitPrice * line.quantity)}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeLine(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end border-t pt-3">
            <p className="text-lg font-bold">
              Tổng cộng: <span className="text-primary">{formatCurrency(total)}</span>
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="quoted-note">Ghi chú gửi kèm báo giá (khách sẽ nhìn thấy)</Label>
            <Textarea id="quoted-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu nháp"}
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Đang gửi..." : quote.status === "sent" ? "Gửi lại báo giá (PDF)" : "Gửi báo giá cho khách (PDF)"}
            </Button>
          </div>
          {quote.sentAt ? (
            <p className="text-right text-xs text-muted-foreground">
              Đã gửi lần gần nhất lúc {formatDate(quote.sentAt)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
