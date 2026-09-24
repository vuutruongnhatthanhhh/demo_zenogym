"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";

// Sentinel tab id for "show every category at once" — same convention as the
// customer-facing catalog.
const ALL_CATEGORY_ID = "all";
const ALL_SERIES_ID = "all";

export function QuickQuoteClient({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORY_ID);
  const [series, setSeries] = useState<string>(ALL_SERIES_ID);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Scoped to the active category tab first — series options and the
  // "series" filter itself only ever apply within whichever tab is open, so
  // a series chosen under one category can never silently hide everything
  // after switching to a tab that doesn't have it (it gets reset instead,
  // see handleCategoryChange).
  const productsInCategory = useMemo(
    () => (category === ALL_CATEGORY_ID ? products : products.filter((p) => p.categoryId === category)),
    [products, category]
  );

  const normalizedSearch = search.trim().toLowerCase();
  const displayedProducts = useMemo(() => {
    let list = productsInCategory;
    if (series !== ALL_SERIES_ID) list = list.filter((p) => p.series === series);
    if (!normalizedSearch) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedSearch) || p.model.toLowerCase().includes(normalizedSearch)
    );
  }, [productsInCategory, series, normalizedSearch]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return counts;
  }, [products]);

  const seriesList = useMemo(() => {
    const values = new Set<string>();
    for (const p of productsInCategory) if (p.series) values.add(p.series);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [productsInCategory]);

  // Switching tabs resets the series filter — a series picked under one
  // category has no guaranteed meaning (or any matches at all) under another.
  function handleCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    setSeries(ALL_SERIES_ID);
  }

  // Stable identities so memoized rows only re-render for the row that
  // actually changed — same fix applied to /catalog for the same reason.
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: quantity };
    });
  }, []);

  const toggleSelected = useCallback(
    (productId: string, checked: boolean) => updateQuantity(productId, checked ? 1 : 0),
    [updateQuantity]
  );

  const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);

  async function handleCreate() {
    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      toast.error("Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ");
      return;
    }
    if (totalItems === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    const items = Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return null;
        return {
          productId: product.id,
          model: product.model,
          name: product.name,
          image: product.image,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          factoryId: product.factoryId,
          factoryName: product.factoryName,
          quantity,
          price: product.priceUsd,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/quotes/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          address: address.trim(),
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tạo báo giá thất bại");
      toast.success("Đã tạo báo giá — tiếp tục chỉnh giá sỉ và gửi cho khách");
      router.push(`/admin/quotes/${data.quote.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/quotes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Tạo báo giá nhanh cho khách</h1>
        <p className="text-sm text-muted-foreground">
          Chọn sản phẩm và nhập thông tin khách hàng — bạn sẽ chỉnh giá sỉ, xác nhận thông tin và
          xem trước/tải/gửi PDF ở bước tiếp theo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="qq-name">Họ tên *</Label>
            <Input id="qq-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qq-phone">Số điện thoại *</Label>
            <Input id="qq-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qq-address">Địa chỉ *</Label>
            <Input id="qq-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chọn sản phẩm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên sản phẩm hoặc model..."
                className="pl-8"
              />
            </div>
            {seriesList.length > 0 ? (
              <div className="w-40 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Series</label>
                <select
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value={ALL_SERIES_ID}>Tất cả</option>
                  {seriesList.map((s) => (
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
              active={category === ALL_CATEGORY_ID}
              onClick={() => handleCategoryChange(ALL_CATEGORY_ID)}
            />
            {categories.map((c) => (
              <TabButton
                key={c.id}
                label={c.name}
                count={categoryCounts.get(c.id) ?? 0}
                active={category === c.id}
                onClick={() => handleCategoryChange(c.id)}
              />
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="max-h-[55vh] overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b bg-slate-50 text-left text-xs text-muted-foreground">
                    <th className="w-10 px-3 py-2 font-medium"></th>
                    <th className="w-16 px-3 py-2 font-medium"></th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="px-3 py-2 font-medium">Series</th>
                    <th className="px-3 py-2 font-medium">Tên sản phẩm</th>
                    <th className="px-3 py-2 font-medium">Loại</th>
                    <th className="w-24 px-3 py-2 text-center font-medium">Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                        Không tìm thấy sản phẩm phù hợp.
                      </td>
                    </tr>
                  ) : (
                    displayedProducts.map((product) => (
                      <QuickProductRow
                        key={product.id}
                        product={product}
                        checked={cart[product.id] !== undefined}
                        quantity={cart[product.id] ?? 1}
                        onToggle={toggleSelected}
                        onQuantityChange={updateQuantity}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <p className="text-sm text-muted-foreground">{totalItems} sản phẩm đã chọn</p>
        <Button onClick={handleCreate} disabled={submitting || totalItems === 0}>
          {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Tạo báo giá
        </Button>
      </div>
    </div>
  );
}

const QuickProductRow = memo(function QuickProductRow({
  product,
  checked,
  quantity,
  onToggle,
  onQuantityChange,
}: {
  product: Product;
  checked: boolean;
  quantity: number;
  onToggle: (productId: string, checked: boolean) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
}) {
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
          onChange={(e) => onToggle(product.id, e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
      </td>
      <td className="px-3 py-2">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
          <Image src={product.image} alt={product.name} fill className="object-cover" />
        </div>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{product.model}</td>
      <td className="px-3 py-2 text-muted-foreground">{product.series || "-"}</td>
      <td className="max-w-[280px] px-3 py-2 font-medium">
        <span className="line-clamp-2">{product.name}</span>
      </td>
      <td className="px-3 py-2">
        <Badge variant="outline" className="text-[10px]">
          {product.categoryName}
        </Badge>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={1}
          value={quantity}
          disabled={!checked}
          onChange={(e) => onQuantityChange(product.id, Math.max(1, Number(e.target.value) || 1))}
          className="h-8 w-16 text-center mx-auto"
        />
      </td>
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
