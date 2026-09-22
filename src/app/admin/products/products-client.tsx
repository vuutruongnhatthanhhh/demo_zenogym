"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatUSD, formatVND } from "@/lib/utils";
import { computePricesUsd, roundWholesaleVnd, usdToVnd, type PricingSettings } from "@/lib/pricing";
import type { Category, Factory, Product } from "@/lib/types";
import type { PaginatedProducts } from "@/lib/data/products";
import { ProductFormDialog } from "./product-form-dialog";

const ALL = "all";
type Currency = "vnd" | "usd";

interface Filters {
  search: string;
  categoryId: string;
  factoryId: string;
  series: string;
  minPrice: string;
  maxPrice: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  categoryId: ALL,
  factoryId: ALL,
  series: ALL,
  minPrice: "",
  maxPrice: "",
};

export function ProductsClient({
  initialResult,
  pageSize,
  categories,
  factories,
  initialPricingSettings,
  seriesList,
}: {
  initialResult: PaginatedProducts;
  pageSize: number;
  categories: Category[];
  factories: Factory[];
  initialPricingSettings: PricingSettings;
  seriesList: string[];
}) {
  const [products, setProducts] = useState(initialResult.products);
  const [total, setTotal] = useState(initialResult.total);
  const [totalPages, setTotalPages] = useState(initialResult.totalPages);
  const [page, setPage] = useState(initialResult.page);
  const [loading, setLoading] = useState(false);
  const [pricingSettings, setPricingSettings] = useState(initialPricingSettings);
  const [currency, setCurrency] = useState<Currency>("vnd");

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [factoryId, setFactoryId] = useState(ALL);
  const [series, setSeries] = useState(ALL);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [committed, setCommitted] = useState<Filters>(EMPTY_FILTERS);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [showRawWholesale, setShowRawWholesale] = useState(false);

  // Debounce: only commit filter changes (and jump back to page 1) 400ms
  // after the user stops typing/selecting, so we don't hit the API on every
  // keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setCommitted({ search, categoryId, factoryId, series, minPrice, maxPrice });
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [search, categoryId, factoryId, series, minPrice, maxPrice]);

  const fetchProducts = useCallback(
    async (targetPage: number, filters: Filters) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("scope", "all");
        params.set("page", String(targetPage));
        params.set("pageSize", String(pageSize));
        if (filters.search.trim()) params.set("search", filters.search.trim());
        if (filters.categoryId !== ALL) params.set("categoryId", filters.categoryId);
        if (filters.factoryId !== ALL) params.set("factoryId", filters.factoryId);
        if (filters.series !== ALL) params.set("series", filters.series);
        if (filters.minPrice) params.set("minPrice", filters.minPrice);
        if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Không tải được danh sách sản phẩm");

        setProducts(data.products);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.pricingSettings) setPricingSettings(data.pricingSettings);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không tải được danh sách sản phẩm");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  // Skip the very first effect run: initialResult was already rendered by
  // the server for the default (unfiltered, page 1) view.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchProducts(page, committed);
  }, [committed, page, fetchProducts]);

  function resetFilters() {
    setSearch("");
    setCategoryId(ALL);
    setFactoryId(ALL);
    setSeries(ALL);
    setMinPrice("");
    setMaxPrice("");
  }

  function openAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  // Update local state directly instead of re-fetching the whole page, so
  // add/edit/delete feel instant. Editing always targets a product already
  // present in `products` (it's opened from a row in this same list), so
  // only genuinely new products hit the "insert" branch below — and only
  // when we can be sure where they belong (page 1, no filters that might
  // exclude them).
  function handleSaved(product: Product) {
    const isNew = !products.some((p) => p.id === product.id);

    setProducts((prev) => {
      if (!isNew) return prev.map((p) => (p.id === product.id ? product : p));
      if (page !== 1 || hasActiveFilters) return prev;
      return [product, ...prev].slice(0, pageSize);
    });

    if (isNew) {
      const newTotal = total + 1;
      setTotal(newTotal);
      setTotalPages(Math.max(1, Math.ceil(newTotal / pageSize)));
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Xóa sản phẩm "${product.model}"?`)) return;
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Xóa sản phẩm thất bại");
      return;
    }
    toast.success("Đã xóa sản phẩm");

    const remaining = products.filter((p) => p.id !== product.id);
    if (remaining.length === 0 && page > 1) {
      // Nothing left on this page and there's an earlier page — its data
      // isn't loaded locally, so this one case still needs a fetch.
      setPage(page - 1);
      return;
    }

    setProducts(remaining);
    const newTotal = Math.max(0, total - 1);
    setTotal(newTotal);
    setTotalPages(Math.max(1, Math.ceil(newTotal / pageSize)));
  }

  const hasActiveFilters =
    search || categoryId !== ALL || factoryId !== ALL || series !== ALL || minPrice || maxPrice;

  function formatPrice(usd: number) {
    return currency === "vnd" ? formatVND(usdToVnd(usd, pricingSettings.usdToVndRate)) : formatUSD(usd);
  }

  // Wholesale gets its own formatter since it's the only price with an
  // optional rounding step.
  function formatWholesalePrice(usd: number) {
    if (currency !== "vnd") return formatUSD(usd);
    return formatVND(roundWholesaleVnd(usdToVnd(usd, pricingSettings.usdToVndRate), pricingSettings));
  }

  function formatRawWholesalePrice(usd: number) {
    return formatVND(Math.round(usdToVnd(usd, pricingSettings.usdToVndRate)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sản phẩm</h1>
          <p className="text-sm text-muted-foreground">{total} thiết bị trong hệ thống</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" /> Thêm sản phẩm
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên sản phẩm hoặc model..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="w-44 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Loại sản phẩm</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value={ALL}>Tất cả</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nhà máy</label>
            <select
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value={ALL}>Tất cả</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Series</label>
            <select
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value={ALL}>Tất cả</option>
              {seriesList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-28 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Giá từ (USD)</label>
            <Input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" />
          </div>
          <div className="w-28 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Đến (USD)</label>
            <Input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="---" />
          </div>
          <div className="w-36 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Đơn vị hiển thị</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="vnd">VNĐ</option>
              <option value="usd">USD</option>
            </select>
          </div>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="mr-1 h-3.5 w-3.5" /> Xoá lọc
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b bg-slate-50 text-left text-xs text-muted-foreground">
                  <th className="w-10 px-3 py-2 font-medium">STT</th>
                  <th className="w-16 px-3 py-2 font-medium"></th>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">Giá nhà máy</th>
                  <th className="px-3 py-2 text-right font-medium">Giá vốn</th>
                  <th className="px-3 py-2 text-right font-medium">Giá lẻ</th>
                  <th className="px-3 py-2 text-right font-medium">
                    <div className="flex items-center justify-end gap-1">
                      Giá sỉ
                      {currency === "vnd" && pricingSettings.roundWholesalePrice ? (
                        <button
                          type="button"
                          title={showRawWholesale ? "Ẩn giá chưa làm tròn" : "Xem giá chưa làm tròn"}
                          onClick={() => setShowRawWholesale((v) => !v)}
                          className={showRawWholesale ? "text-primary" : "text-muted-foreground"}
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
                  <th className="px-3 py-2 font-medium">Tên sản phẩm</th>
                  <th className="px-3 py-2 font-medium">Loại</th>
                  <th className="px-3 py-2 font-medium">Nhà máy</th>
                  <th className="px-3 py-2 font-medium">Trạng thái</th>
                  <th className="px-3 py-2 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                      Không tìm thấy sản phẩm phù hợp.
                    </td>
                  </tr>
                ) : (
                  products.map((product, index) => {
                    const prices = computePricesUsd(product.priceUsd, pricingSettings);
                    return (
                    <tr key={product.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="px-3 py-2 text-muted-foreground">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: product.image, alt: product.name })}
                          className="relative block h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100 transition-opacity hover:opacity-80"
                        >
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {product.model}
                        {product.series ? (
                          <p className="text-[10px] text-muted-foreground/70">Series: {product.series}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatPrice(prices.factoryUsd)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatPrice(prices.costUsd)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">
                        {formatPrice(prices.retailUsd)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <p>{formatWholesalePrice(prices.wholesaleUsd)}</p>
                        {currency === "vnd" && pricingSettings.roundWholesalePrice && showRawWholesale ? (
                          <p className="text-xs text-muted-foreground">
                            Chưa làm tròn: {formatRawWholesalePrice(prices.wholesaleUsd)}
                          </p>
                        ) : null}
                      </td>
                      <td className="max-w-[220px] px-3 py-2 font-medium">
                        <span className="line-clamp-2">{product.name}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {product.categoryName}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{product.factoryName}</td>
                      <td className="px-3 py-2">
                        <Badge variant={product.available ? "success" : "secondary"}>
                          {product.available ? "Đang bán" : "Ngừng bán"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(product)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Trang {page}/{totalPages} · {total} sản phẩm
        </p>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categories}
        factories={factories}
        onSaved={handleSaved}
      />

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
