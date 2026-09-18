"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  Factory,
  Lock,
  Percent,
  RotateCcw,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn, formatVND, formatDate, slugify } from "@/lib/utils";
import { computePricesUsd, roundWholesaleVnd, usdToVnd, type PricingSettings } from "@/lib/pricing";
import type { QuoteLineItem, QuoteRequest, QuoteRequestItem } from "@/lib/types";

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

// Quotes created before category snapshots were added to QuoteRequestItem
// have no categoryId/categoryName; group those under one fallback tab
// instead of a blank/mismatched tab.
const UNCATEGORIZED_ID = "uncategorized";

// vi-VN's thousands separator is "." (e.g. 4.381.580), which is what admins
// expect to see/type for VND amounts.
function formatThousands(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

// Reformatting the value on every keystroke (inserting/removing "."
// separators) shifts digit positions out from under the cursor — deleting a
// digit mid-number could collapse a leading zero and jump the caret to the
// end before the admin finished editing. Showing plain, unformatted digits
// while the field is focused sidesteps this entirely (native cursor
// behavior just works); the "." separators only get applied once the admin
// is done, on blur.
function PriceInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState(() => formatThousands(value));

  useEffect(() => {
    if (!focused) setDisplay(formatThousands(value));
  }, [value, focused]);

  function handleFocus() {
    setFocused(true);
    setDisplay(value ? String(value) : "");
  }

  function handleBlur() {
    setFocused(false);
    setDisplay(formatThousands(value));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setDisplay(digits);
    onChange(digits ? Number(digits) : 0);
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={display}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={className}
    />
  );
}

function buildInitialLines(quote: QuoteRequest, pricingSettings: PricingSettings): QuoteLineItem[] {
  if (quote.quotedItems && quote.quotedItems.length > 0) return quote.quotedItems;
  return quote.items.map((item) => {
    const wholesaleUsd = computePricesUsd(item.price, pricingSettings).wholesaleUsd;
    return {
      productId: item.productId,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      unitPrice: roundWholesaleVnd(usdToVnd(wholesaleUsd, pricingSettings.usdToVndRate), pricingSettings),
    };
  });
}

export function QuoteDetailClient({
  quote: initialQuote,
  pricingSettings,
}: {
  quote: QuoteRequest;
  pricingSettings: PricingSettings;
}) {
  const [quote, setQuote] = useState(initialQuote);
  const [lines, setLines] = useState<QuoteLineItem[]>(() =>
    buildInitialLines(initialQuote, pricingSettings)
  );
  const [note, setNote] = useState(initialQuote.quotedNote ?? "");
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unlockedQtyRows, setUnlockedQtyRows] = useState<Set<number>>(() => new Set());
  const [showRawWholesale, setShowRawWholesale] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [factoryFilter, setFactoryFilter] = useState("all");
  const [downloadingFactoryPdf, setDownloadingFactoryPdf] = useState(false);

  function toggleQtyLock(idx: number) {
    setUnlockedQtyRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const originalByProductId = useMemo(() => {
    const map = new Map<string, QuoteRequestItem>();
    quote.items.forEach((item) => map.set(item.productId, item));
    return map;
  }, [quote.items]);

  // Which factories actually show up in this quote (with item counts) —
  // drives both the filter dropdown and the "gửi nhà máy" PDF download.
  const distinctFactories = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    quote.items.forEach((item) => {
      if (!item.factoryId) return;
      const existing = map.get(item.factoryId);
      if (existing) existing.count += 1;
      else map.set(item.factoryId, { name: item.factoryName || "Không rõ", count: 1 });
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, name: v.name, count: v.count }));
  }, [quote.items]);

  const selectedFactory =
    factoryFilter === "all"
      ? { name: "Tất cả nhà máy", count: quote.items.length }
      : distinctFactories.find((f) => f.id === factoryFilter) ?? { name: "Không rõ", count: 0 };

  function lineCategory(productId: string) {
    const original = originalByProductId.get(productId);
    return {
      id: original?.categoryId || UNCATEGORIZED_ID,
      name: original?.categoryName || "Chưa phân loại",
    };
  }

  const tabs = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const line of lines) {
      const category = lineCategory(line.productId);
      const existing = map.get(category.id);
      if (existing) existing.count += 1;
      else map.set(category.id, { id: category.id, name: category.name, count: 1 });
    }
    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, originalByProductId]);

  const [activeCategory, setActiveCategory] = useState<string>(() => tabs[0]?.id ?? "");
  const currentTab = activeCategory || tabs[0]?.id || "";

  const visibleLines = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => lineCategory(line.productId).id === currentTab);

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const totalCost = lines.reduce((sum, l) => {
    const original = originalByProductId.get(l.productId);
    if (!original) return sum;
    const costUsd = computePricesUsd(original.price, pricingSettings).costUsd;
    return sum + usdToVnd(costUsd, pricingSettings.usdToVndRate) * l.quantity;
  }, 0);
  const profit = total - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // How far the current total (whatever it is now — default, rounded, or
  // hand-edited) sits from what it'd be using the raw, unrounded default
  // prices — only meaningful when rounding is actually turned on.
  const totalRawDefault = lines.reduce((sum, l) => {
    const original = originalByProductId.get(l.productId);
    if (!original) return sum;
    const wholesaleUsd = computePricesUsd(original.price, pricingSettings).wholesaleUsd;
    return sum + Math.round(usdToVnd(wholesaleUsd, pricingSettings.usdToVndRate)) * l.quantity;
  }, 0);
  const deviationFromRaw = total - totalRawDefault;

  function updateLine(index: number, patch: Partial<QuoteLineItem>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  // A quote already priced before rounding was turned on keeps its old,
  // unrounded saved prices on load (buildInitialLines only computes fresh
  // defaults when there's no saved draft yet) — this re-applies the current
  // default (rounded, if enabled) to every line in one go.
  function handleResetAllToDefault() {
    setLines((prev) =>
      prev.map((l) => {
        const original = originalByProductId.get(l.productId);
        if (!original) return l;
        const wholesaleUsd = computePricesUsd(original.price, pricingSettings).wholesaleUsd;
        return {
          ...l,
          unitPrice: roundWholesaleVnd(usdToVnd(wholesaleUsd, pricingSettings.usdToVndRate), pricingSettings),
        };
      })
    );
  }

  async function fetchPreviewPdfBlob() {
    const res = await fetch(`/api/quotes/${quote.id}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lines, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Tạo PDF thất bại");
    }
    return res.blob();
  }

  async function handlePreview() {
    if (lines.length === 0) {
      toast.error("Danh sách sản phẩm trống");
      return;
    }
    setPreviewing(true);
    try {
      const blob = await fetchPreviewPdfBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleDownload() {
    if (lines.length === 0) {
      toast.error("Danh sách sản phẩm trống");
      return;
    }
    setDownloading(true);
    try {
      const blob = await fetchPreviewPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-gia-${quote.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadFactoryPdf() {
    setDownloadingFactoryPdf(true);
    try {
      const res = await fetch(
        `/api/quotes/${quote.id}/factory-pdf?factoryId=${encodeURIComponent(factoryFilter)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Tạo PDF thất bại");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const factorySuffix = factoryFilter !== "all" ? `-${slugify(selectedFactory.name)}` : "";
      a.download = `bao-gia-nha-may${factorySuffix}-${quote.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setDownloadingFactoryPdf(false);
    }
  }

  async function handleSend() {
    if (lines.length === 0) {
      toast.error("Danh sách sản phẩm trống");
      return;
    }
    const confirmed = confirm(
      `Gửi báo giá PDF qua email cho ${quote.customerEmail}?\nTổng tiền: ${formatVND(total)}`
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
          {quote.address ? (
            <p><span className="text-muted-foreground">Địa chỉ: </span>{quote.address}</p>
          ) : null}
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            <p>
              Giá sỉ đang tính = Giá nhà máy +{" "}
              <span className="font-semibold text-primary">{pricingSettings.wholesaleMarkupPercent}%</span>
              {pricingSettings.roundWholesalePrice ? ", đã làm tròn" : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleResetAllToDefault}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Đặt lại tất cả về giá mặc định
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/pricing-settings">
                  <Percent className="mr-1 h-3.5 w-3.5" /> Chỉnh cấu hình giá
                </Link>
              </Button>
            </div>
          </div>

          {distinctFactories.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
              <Factory className="h-4 w-4 shrink-0 text-muted-foreground" />
              <select
                value={factoryFilter}
                onChange={(e) => setFactoryFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="all">Tất cả nhà máy ({quote.items.length})</option>
                {distinctFactories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.count})
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadFactoryPdf}
                disabled={downloadingFactoryPdf}
                className="ml-auto"
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                {downloadingFactoryPdf
                  ? "Đang tải..."
                  : `Tải PDF gửi nhà máy (${selectedFactory.name} · ${selectedFactory.count} sản phẩm)`}
              </Button>
            </div>
          ) : null}

          <div className="flex gap-1 overflow-x-auto border-b">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                label={tab.name}
                count={tab.count}
                active={currentTab === tab.id}
                onClick={() => setActiveCategory(tab.id)}
              />
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="max-h-[55vh] overflow-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b bg-slate-50 text-left text-xs text-muted-foreground">
                    <th className="w-16 px-3 py-2 font-medium"></th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="w-32 px-3 py-2 text-right font-medium">
                      <div className="flex items-center justify-end gap-1">
                        Giá sỉ
                        {pricingSettings.roundWholesalePrice ? (
                          <button
                            type="button"
                            title={showRawWholesale ? "Ẩn giá chưa làm tròn" : "Xem giá chưa làm tròn"}
                            onClick={() => setShowRawWholesale((v) => !v)}
                            className={cn(
                              "rounded p-0.5 hover:bg-accent hover:text-foreground",
                              showRawWholesale ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {showRawWholesale ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Giá vốn</th>
                    <th className="px-3 py-2 text-right font-medium">Giá lẻ</th>
                    <th className="px-3 py-2 font-medium">Tên sản phẩm</th>
                    <th className="w-24 px-3 py-2 text-center font-medium">SL</th>
                    <th className="px-3 py-2 text-right font-medium">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                        Không có sản phẩm nào trong loại này.
                      </td>
                    </tr>
                  ) : (
                    visibleLines.map(({ line, idx }) => {
                      const original = originalByProductId.get(line.productId);
                      const prices = original ? computePricesUsd(original.price, pricingSettings) : null;
                      return (
                        <tr key={`${line.productId}-${idx}`} className="border-b last:border-0 hover:bg-accent/30">
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ src: line.image, alt: line.name })}
                              className="relative block h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100 transition-opacity hover:opacity-80"
                            >
                              <Image src={line.image} alt={line.name} fill className="object-cover" />
                            </button>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{original?.model ?? "-"}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center justify-end gap-1">
                                <PriceInput
                                  value={line.unitPrice}
                                  onChange={(unitPrice) => updateLine(idx, { unitPrice })}
                                  className="h-8 w-28 text-right"
                                />
                                {prices ? (
                                  <button
                                    type="button"
                                    title="Đặt lại giá sỉ mặc định"
                                    onClick={() =>
                                      updateLine(idx, {
                                        unitPrice: roundWholesaleVnd(
                                          usdToVnd(prices.wholesaleUsd, pricingSettings.usdToVndRate),
                                          pricingSettings
                                        ),
                                      })
                                    }
                                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>
                              {prices && pricingSettings.roundWholesalePrice && showRawWholesale ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Chưa làm tròn:{" "}
                                  {formatVND(
                                    Math.round(usdToVnd(prices.wholesaleUsd, pricingSettings.usdToVndRate))
                                  )}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {prices ? formatVND(usdToVnd(prices.costUsd, pricingSettings.usdToVndRate)) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {prices ? formatVND(usdToVnd(prices.retailUsd, pricingSettings.usdToVndRate)) : "-"}
                          </td>
                          <td className="max-w-[220px] px-3 py-2 font-medium">
                            <span className="line-clamp-2">{line.name}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title={
                                  unlockedQtyRows.has(idx)
                                    ? "Khóa lại số lượng"
                                    : "Mở khóa để chỉnh số lượng"
                                }
                                onClick={() => toggleQtyLock(idx)}
                                className="shrink-0 rounded p-1 text-destructive hover:bg-destructive/10"
                              >
                                {unlockedQtyRows.has(idx) ? (
                                  <Unlock className="h-3.5 w-3.5" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5" />
                                )}
                              </button>
                              {unlockedQtyRows.has(idx) ? (
                                <Input
                                  type="number"
                                  min={1}
                                  value={line.quantity}
                                  onChange={(e) =>
                                    updateLine(idx, {
                                      quantity: Math.max(1, Number(e.target.value) || 1),
                                    })
                                  }
                                  className="h-8 w-16 text-center"
                                />
                              ) : (
                                <span>{line.quantity}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-primary">
                            {formatVND(line.unitPrice * line.quantity)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 border-t pt-3">
            <p className="text-lg font-bold">
              Tổng cộng (giá sỉ): <span className="text-primary">{formatVND(total)}</span>
            </p>
            <p className={cn("text-sm", profit >= 0 ? "text-success" : "text-destructive")}>
              Tiền lời so với giá vốn: {formatVND(profit)} ({profitPercent.toFixed(1)}%)
            </p>
            {pricingSettings.roundWholesalePrice && deviationFromRaw !== 0 ? (
              <p className="text-xs text-muted-foreground">
                Lệch {deviationFromRaw > 0 ? "+" : "-"}
                {formatVND(Math.abs(deviationFromRaw))} so với giá chưa làm tròn
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="quoted-note">Ghi chú gửi kèm báo giá (khách sẽ nhìn thấy)</Label>
            <Textarea id="quoted-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handlePreview} disabled={previewing}>
              <Eye className="mr-1 h-4 w-4" />
              {previewing ? "Đang tạo PDF..." : "Xem trước PDF"}
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={downloading}>
              <Download className="mr-1 h-4 w-4" />
              {downloading ? "Đang tải..." : "Tải PDF"}
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Đang gửi..." : quote.status === "sent" ? "Gửi lại báo giá (PDF)" : "Gửi báo giá cho khách (PDF)"}
            </Button>
          </div>
          {quote.sentAt ? (
            <p className="text-right text-xs text-muted-foreground">
              Đã gửi {quote.sentCount} lần, gần nhất lúc {formatDate(quote.sentAt)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="sr-only">{previewImage?.alt ?? "Ảnh sản phẩm"}</DialogTitle>
          {previewImage ? (
            <div className="relative h-[70vh] w-full">
              <Image src={previewImage.src} alt={previewImage.alt} fill sizes="90vw" className="object-contain" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {label}{" "}
      <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
        {count}
      </span>
    </button>
  );
}
