"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatVND, formatDate, slugify } from "@/lib/utils";
import { computePricesUsd, roundWholesaleVnd, usdToVnd, type PricingSettings } from "@/lib/pricing";
import { DEFAULT_SELLER_PARTY, type QuotePartyInfo } from "@/lib/pdf/party-info";
import type { Category, Product, QuoteLineItem, QuoteRequest, QuoteRequestItem } from "@/lib/types";

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

// Sentinel tab id for "show every category at once" — same convention as
// the customer-facing catalog's "Tất cả" tab.
const ALL_CATEGORY_TAB_ID = "all";

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
      model: item.model,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      factoryId: item.factoryId,
      factoryName: item.factoryName,
      factoryPriceUsd: item.price,
    };
  });
}

export function QuoteDetailClient({
  quote: initialQuote,
  pricingSettings,
  products,
  categories,
}: {
  quote: QuoteRequest;
  pricingSettings: PricingSettings;
  products: Product[];
  categories: Category[];
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
  const [savingDraft, setSavingDraft] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<string>(ALL_CATEGORY_TAB_ID);
  const [addSeries, setAddSeries] = useState<string>(ALL_CATEGORY_TAB_ID);
  const [addSearch, setAddSearch] = useState("");

  // Contract party info shown on the PDF — confirmed (and editable) by the
  // admin right before previewing/downloading/sending, so a typo in the
  // customer's info or a company detail change can be fixed on the spot.
  const [party, setParty] = useState<QuotePartyInfo>(() => ({
    ...DEFAULT_SELLER_PARTY,
    buyerName: initialQuote.customerName,
    buyerPhone: initialQuote.customerPhone,
    buyerAddress: initialQuote.address ?? "",
  }));
  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"preview" | "download" | "send" | null>(null);
  // Separate from `party` since it isn't printed on the PDF — only needed to
  // pick a send target. Quotes created without an email (e.g. an admin's
  // own quick-created quote) start blank here and must be filled in before
  // sending.
  const [sendEmail, setSendEmail] = useState(initialQuote.customerEmail ?? "");

  function updateParty(patch: Partial<QuotePartyInfo>) {
    setParty((prev) => ({ ...prev, ...patch }));
  }

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

  // Category/price reference for a line — lines carry their own snapshot
  // (set when built/added, see buildInitialLines/toggleAddProduct) so this
  // only needs the original quote.items lookup as a fallback for quotes
  // saved before that snapshot existed.
  function lineSource(line: QuoteLineItem) {
    const fallback = originalByProductId.get(line.productId);
    return {
      model: line.model ?? fallback?.model,
      categoryId: line.categoryId ?? fallback?.categoryId,
      categoryName: line.categoryName ?? fallback?.categoryName,
      factoryId: line.factoryId ?? fallback?.factoryId,
      factoryName: line.factoryName ?? fallback?.factoryName,
      factoryPriceUsd: line.factoryPriceUsd ?? fallback?.price,
    };
  }

  // Which factories actually show up in the CURRENT price table (not the
  // customer's original request) — so products the admin added/removed
  // here are reflected immediately, drives both the filter dropdown and the
  // "gửi nhà máy" PDF download.
  const distinctFactories = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const line of lines) {
      const source = lineSource(line);
      if (!source.factoryId) continue;
      const existing = map.get(source.factoryId);
      if (existing) existing.count += 1;
      else map.set(source.factoryId, { name: source.factoryName || "Không rõ", count: 1 });
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, name: v.name, count: v.count }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, originalByProductId]);

  const selectedFactory =
    factoryFilter === "all"
      ? { name: "Tất cả nhà máy", count: lines.length }
      : distinctFactories.find((f) => f.id === factoryFilter) ?? { name: "Không rõ", count: 0 };

  // "Thêm sản phẩm" dialog's own search/tab filtering over the full catalog
  // — independent of the price table's tabs above.
  const addNormalizedSearch = addSearch.trim().toLowerCase();
  const addDialogProducts = useMemo(() => {
    let list =
      addCategory === ALL_CATEGORY_TAB_ID ? products : products.filter((p) => p.categoryId === addCategory);
    if (addSeries !== ALL_CATEGORY_TAB_ID) list = list.filter((p) => p.series === addSeries);
    if (!addNormalizedSearch) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(addNormalizedSearch) ||
        p.model.toLowerCase().includes(addNormalizedSearch)
    );
  }, [products, addCategory, addSeries, addNormalizedSearch]);

  const addSeriesList = useMemo(() => {
    const values = new Set<string>();
    for (const p of products) if (p.series) values.add(p.series);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const addCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return counts;
  }, [products]);

  function lineCategory(line: QuoteLineItem) {
    const source = lineSource(line);
    return {
      id: source.categoryId || UNCATEGORIZED_ID,
      name: source.categoryName || "Chưa phân loại",
    };
  }

  const tabs = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const line of lines) {
      const category = lineCategory(line);
      const existing = map.get(category.id);
      if (existing) existing.count += 1;
      else map.set(category.id, { id: category.id, name: category.name, count: 1 });
    }
    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, originalByProductId]);

  const [activeCategory, setActiveCategory] = useState<string>(() => ALL_CATEGORY_TAB_ID);
  const currentTab = activeCategory || ALL_CATEGORY_TAB_ID;

  const visibleLines = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => currentTab === ALL_CATEGORY_TAB_ID || lineCategory(line).id === currentTab);

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const totalCost = lines.reduce((sum, l) => {
    const source = lineSource(l);
    if (source.factoryPriceUsd === undefined) return sum;
    const costUsd = computePricesUsd(source.factoryPriceUsd, pricingSettings).costUsd;
    return sum + usdToVnd(costUsd, pricingSettings.usdToVndRate) * l.quantity;
  }, 0);
  const profit = total - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // How far the current total (whatever it is now — default, rounded, or
  // hand-edited) sits from what it'd be using the raw, unrounded default
  // prices — only meaningful when rounding is actually turned on.
  const totalRawDefault = lines.reduce((sum, l) => {
    const source = lineSource(l);
    if (source.factoryPriceUsd === undefined) return sum;
    const wholesaleUsd = computePricesUsd(source.factoryPriceUsd, pricingSettings).wholesaleUsd;
    return sum + Math.round(usdToVnd(wholesaleUsd, pricingSettings.usdToVndRate)) * l.quantity;
  }, 0);
  const deviationFromRaw = total - totalRawDefault;

  function updateLine(index: number, patch: Partial<QuoteLineItem>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
    // Indices shift after a removal, so any locked/unlocked-by-index state
    // would point at the wrong row — simplest correct fix is to reset it.
    setUnlockedQtyRows(new Set());
  }

  // Stable identity (deps limited to pricingSettings) so the memoized rows
  // in the "Thêm sản phẩm" dialog only re-render the row that was toggled.
  const toggleAddProduct = useCallback(
    (product: Product, checked: boolean) => {
      if (checked) {
        const wholesaleUsd = computePricesUsd(product.priceUsd, pricingSettings).wholesaleUsd;
        setLines((prev) => {
          if (prev.some((l) => l.productId === product.id)) return prev;
          return [
            ...prev,
            {
              productId: product.id,
              name: product.name,
              image: product.image,
              quantity: 1,
              unitPrice: roundWholesaleVnd(
                usdToVnd(wholesaleUsd, pricingSettings.usdToVndRate),
                pricingSettings
              ),
              model: product.model,
              categoryId: product.categoryId,
              categoryName: product.categoryName,
              factoryId: product.factoryId,
              factoryName: product.factoryName,
              factoryPriceUsd: product.priceUsd,
            },
          ];
        });
      } else {
        setLines((prev) => prev.filter((l) => l.productId !== product.id));
        setUnlockedQtyRows(new Set());
      }
    },
    [pricingSettings]
  );

  async function handleSaveDraft() {
    if (lines.length === 0) {
      toast.error("Danh sách sản phẩm trống");
      return;
    }
    setSavingDraft(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Lưu thất bại");
      setQuote(data.quote);
      toast.success("Đã lưu báo giá");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingDraft(false);
    }
  }

  // A quote already priced before rounding was turned on keeps its old,
  // unrounded saved prices on load (buildInitialLines only computes fresh
  // defaults when there's no saved draft yet) — this re-applies the current
  // default (rounded, if enabled) to every line in one go.
  function handleResetAllToDefault() {
    setLines((prev) =>
      prev.map((l) => {
        const source = lineSource(l);
        if (source.factoryPriceUsd === undefined) return l;
        const wholesaleUsd = computePricesUsd(source.factoryPriceUsd, pricingSettings).wholesaleUsd;
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
      body: JSON.stringify({ items: lines, note, party }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Tạo PDF thất bại");
    }
    return res.blob();
  }

  async function runPreview() {
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

  async function runDownload() {
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
    // Built from the current (possibly unsaved) `lines` — not the customer's
    // original request — so products the admin just added/edited/removed
    // show up immediately, without needing a save first.
    const requestItems: QuoteRequestItem[] = lines
      .filter((l) => factoryFilter === "all" || lineSource(l).factoryId === factoryFilter)
      .map((line) => {
        const source = lineSource(line);
        return {
          productId: line.productId,
          model: source.model ?? "-",
          name: line.name,
          image: line.image,
          categoryId: source.categoryId ?? UNCATEGORIZED_ID,
          categoryName: source.categoryName ?? "Chưa phân loại",
          factoryId: source.factoryId,
          factoryName: source.factoryName,
          quantity: line.quantity,
          price: source.factoryPriceUsd ?? 0,
        };
      });

    if (requestItems.length === 0) {
      toast.error("Không có sản phẩm nào thuộc nhà máy này");
      return;
    }

    setDownloadingFactoryPdf(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/factory-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: requestItems }),
      });
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

  async function runSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, note, party, customerEmail: sendEmail }),
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

  // All 3 PDF actions first pop the party-info confirmation dialog — the
  // admin gets one last look (and edit chance) at exactly what will be
  // printed on the contract before anything is actually generated/sent.
  function openPartyConfirm(action: "preview" | "download" | "send") {
    if (lines.length === 0) {
      toast.error("Danh sách sản phẩm trống");
      return;
    }
    setPendingAction(action);
    setPartyDialogOpen(true);
  }

  async function handleConfirmParty() {
    if (pendingAction === "send" && !sendEmail.trim()) {
      toast.error("Vui lòng nhập email khách hàng để gửi báo giá");
      return;
    }
    const action = pendingAction;
    setPartyDialogOpen(false);
    setPendingAction(null);
    if (action === "preview") await runPreview();
    else if (action === "download") await runDownload();
    else if (action === "send") await runSend();
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
          {quote.customerEmail ? (
            <p><span className="text-muted-foreground">Email: </span>{quote.customerEmail}</p>
          ) : null}
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
                <option value="all">Tất cả nhà máy ({lines.length})</option>
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 overflow-x-auto border-b">
              <TabButton
                label="Tất cả"
                count={lines.length}
                active={currentTab === ALL_CATEGORY_TAB_ID}
                onClick={() => setActiveCategory(ALL_CATEGORY_TAB_ID)}
              />
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
            <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Thêm sản phẩm
            </Button>
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
                    <th className="w-10 px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLines.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                        Không có sản phẩm nào trong loại này.
                      </td>
                    </tr>
                  ) : (
                    visibleLines.map(({ line, idx }) => {
                      const source = lineSource(line);
                      const prices =
                        source.factoryPriceUsd !== undefined
                          ? computePricesUsd(source.factoryPriceUsd, pricingSettings)
                          : null;
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
                          <td className="px-3 py-2 text-muted-foreground">{source.model ?? "-"}</td>
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
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              title="Bỏ sản phẩm này khỏi báo giá"
                              onClick={() => removeLine(idx)}
                              className="rounded p-1 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
            <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
              <Save className="mr-1 h-4 w-4" />
              {savingDraft ? "Đang lưu..." : "Lưu báo giá"}
            </Button>
            <Button variant="outline" onClick={() => openPartyConfirm("preview")} disabled={previewing}>
              <Eye className="mr-1 h-4 w-4" />
              {previewing ? "Đang tạo PDF..." : "Xem trước PDF"}
            </Button>
            <Button variant="outline" onClick={() => openPartyConfirm("download")} disabled={downloading}>
              <Download className="mr-1 h-4 w-4" />
              {downloading ? "Đang tải..." : "Tải PDF"}
            </Button>
            <Button onClick={() => openPartyConfirm("send")} disabled={sending}>
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

      <Dialog open={partyDialogOpen} onOpenChange={(open) => !open && setPartyDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Xác nhận thông tin trên hợp đồng PDF</DialogTitle>
            <DialogDescription>
              Kiểm tra và chỉnh sửa nếu cần trước khi{" "}
              {pendingAction === "preview"
                ? "xem trước"
                : pendingAction === "download"
                  ? "tải"
                  : "gửi"}{" "}
              PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Bên bán hàng (Bên A)</p>
            <div className="space-y-1">
              <Label htmlFor="party-seller-name">Tên công ty</Label>
              <Input
                id="party-seller-name"
                value={party.sellerName}
                onChange={(e) => updateParty({ sellerName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="party-seller-address">Địa chỉ</Label>
              <Input
                id="party-seller-address"
                value={party.sellerAddress}
                onChange={(e) => updateParty({ sellerAddress: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="party-seller-tax">MST</Label>
                <Input
                  id="party-seller-tax"
                  value={party.sellerTaxId}
                  onChange={(e) => updateParty({ sellerTaxId: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="party-seller-position">Chức vụ</Label>
                <Input
                  id="party-seller-position"
                  value={party.sellerPosition}
                  onChange={(e) => updateParty({ sellerPosition: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="party-seller-rep">Đại diện</Label>
              <Input
                id="party-seller-rep"
                value={party.sellerRepresentative}
                onChange={(e) => updateParty({ sellerRepresentative: e.target.value })}
              />
            </div>

            <p className="pt-2 text-sm font-semibold text-foreground">Bên mua hàng (Bên B)</p>
            <div className="space-y-1">
              <Label htmlFor="party-buyer-name">Họ tên khách</Label>
              <Input
                id="party-buyer-name"
                value={party.buyerName}
                onChange={(e) => updateParty({ buyerName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="party-buyer-phone">Số điện thoại</Label>
              <Input
                id="party-buyer-phone"
                value={party.buyerPhone}
                onChange={(e) => updateParty({ buyerPhone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="party-buyer-address">Địa chỉ</Label>
              <Input
                id="party-buyer-address"
                value={party.buyerAddress}
                onChange={(e) => updateParty({ buyerAddress: e.target.value })}
              />
            </div>

            {pendingAction === "send" ? (
              <div className="space-y-1">
                <Label htmlFor="party-buyer-email">Email khách (để gửi báo giá) *</Label>
                <Input
                  id="party-buyer-email"
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="ban@congty.com"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPartyDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleConfirmParty} disabled={previewing || downloading || sending}>
              Xác nhận & tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Thêm sản phẩm vào báo giá</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Tìm theo tên sản phẩm hoặc model..."
                className="pl-8"
              />
            </div>
            {addSeriesList.length > 0 ? (
              <div className="w-40 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Series</label>
                <select
                  value={addSeries}
                  onChange={(e) => setAddSeries(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value={ALL_CATEGORY_TAB_ID}>Tất cả</option>
                  {addSeriesList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1 border-b">
            <TabButton
              label="Tất cả"
              count={products.length}
              active={addCategory === ALL_CATEGORY_TAB_ID}
              onClick={() => setAddCategory(ALL_CATEGORY_TAB_ID)}
            />
            {categories.map((c) => (
              <TabButton
                key={c.id}
                label={c.name}
                count={addCategoryCounts.get(c.id) ?? 0}
                active={addCategory === c.id}
                onClick={() => setAddCategory(c.id)}
              />
            ))}
          </div>

          <div className="max-h-[55vh] overflow-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b bg-slate-50 text-left text-xs text-muted-foreground">
                  <th className="w-10 px-3 py-2 font-medium"></th>
                  <th className="w-16 px-3 py-2 font-medium"></th>
                  <th className="px-3 py-2 font-medium">Tên sản phẩm</th>
                  <th className="px-3 py-2 text-right font-medium">Giá sỉ mặc định</th>
                </tr>
              </thead>
              <tbody>
                {addDialogProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                      Không tìm thấy sản phẩm phù hợp.
                    </td>
                  </tr>
                ) : (
                  addDialogProducts.map((product) => (
                    <AddProductRow
                      key={product.id}
                      product={product}
                      checked={lines.some((l) => l.productId === product.id)}
                      pricingSettings={pricingSettings}
                      onToggle={toggleAddProduct}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button onClick={() => setAddDialogOpen(false)}>Xong ({lines.length} sản phẩm)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

const AddProductRow = memo(function AddProductRow({
  product,
  checked,
  pricingSettings,
  onToggle,
}: {
  product: Product;
  checked: boolean;
  pricingSettings: PricingSettings;
  onToggle: (product: Product, checked: boolean) => void;
}) {
  const wholesaleUsd = computePricesUsd(product.priceUsd, pricingSettings).wholesaleUsd;
  const wholesaleVnd = roundWholesaleVnd(usdToVnd(wholesaleUsd, pricingSettings.usdToVndRate), pricingSettings);

  return (
    <tr
      className={cn(
        "border-b last:border-0 hover:bg-accent/30",
        checked && "bg-primary/10 font-bold text-foreground"
      )}
    >
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(product, e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
      </td>
      <td className="px-3 py-2">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
          <Image src={product.image} alt={product.name} fill className="object-cover" />
        </div>
      </td>
      <td className="max-w-[280px] px-3 py-2 font-medium">
        <span className="line-clamp-2">{product.name}</span>
        <p className="text-xs font-normal text-muted-foreground">
          {product.model} · {product.categoryName}
          {product.series ? ` · Series: ${product.series}` : ""}
        </p>
      </td>
      <td className="px-3 py-2 text-right font-semibold text-primary">{formatVND(wholesaleVnd)}</td>
    </tr>
  );
});

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
