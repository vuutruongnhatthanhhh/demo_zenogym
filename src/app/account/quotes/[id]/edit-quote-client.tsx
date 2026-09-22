"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDate, formatVND } from "@/lib/utils";
import { computePricesUsd, usdToVnd, type PricingSettings } from "@/lib/pricing";
import type { Category, Product } from "@/lib/types";

const ALL_CATEGORY_ID = "all";

export function EditQuoteClient({
  products,
  categories,
  pricingSettings,
  quote,
  initialItems,
  initialNote,
}: {
  products: Product[];
  categories: Category[];
  pricingSettings: PricingSettings;
  quote: { id: string; code: string; createdAt: string };
  initialItems: Record<string, number>;
  initialNote?: string;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>(initialItems);
  const [note, setNote] = useState(initialNote ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [category, setCategory] = useState<string>(ALL_CATEGORY_ID);
  const [search, setSearch] = useState("");

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const selectedLines = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = productById.get(productId);
        return product ? { product, quantity } : null;
      })
      .filter((line): line is { product: Product; quantity: number } => line !== null);
  }, [cart, productById]);

  const totalItems = selectedLines.reduce((sum, l) => sum + l.quantity, 0);

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

  const removeProduct = useCallback((productId: string) => updateQuantity(productId, 0), [updateQuantity]);

  const normalizedSearch = search.trim().toLowerCase();
  const dialogProducts = useMemo(() => {
    const byCategory =
      category === ALL_CATEGORY_ID ? products : products.filter((p) => p.categoryId === category);
    if (!normalizedSearch) return byCategory;
    return byCategory.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedSearch) || p.model.toLowerCase().includes(normalizedSearch)
    );
  }, [products, category, normalizedSearch]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return counts;
  }, [products]);

  async function handleSubmit() {
    if (totalItems === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }
    const items = selectedLines.map(({ product, quantity }) => ({
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
    }));

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/resubmit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, note: note || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      toast.success("Đã cập nhật và gửi lại yêu cầu báo giá!");
      router.push("/account/quotes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/account/quotes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-primary">Yêu cầu báo giá đã gửi</h1>
          <p className="text-sm text-muted-foreground">
            Mã: <span className="font-medium text-foreground">{quote.code}</span> · Gửi lúc{" "}
            {formatDate(quote.createdAt)}
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Sản phẩm đã chọn ({totalItems})</CardTitle>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Thêm sản phẩm
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {selectedLines.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Chưa có sản phẩm nào. Bấm &quot;Thêm sản phẩm&quot; để chọn thiết bị.
              </p>
            ) : (
              <div className="divide-y">
                {selectedLines.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-3 p-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                      <Image src={product.image} alt={product.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.model} · {product.categoryName}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => updateQuantity(product.id, Math.max(1, Number(e.target.value) || 1))}
                      className="h-8 w-16 shrink-0 text-center"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeProduct(product.id)}
                      title="Bỏ sản phẩm này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-1">
          <Label htmlFor="edit-quote-note">Ghi chú</Label>
          <Textarea
            id="edit-quote-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: cần lắp đặt trước 30/9, số lượng phòng tập..."
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting || totalItems === 0}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Cập nhật & gửi lại yêu cầu
          </Button>
        </div>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Thêm sản phẩm</DialogTitle>
          </DialogHeader>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên sản phẩm hoặc model..."
              className="pl-8"
            />
          </div>

          <div className="flex flex-wrap gap-1 border-b">
            <TabButton
              label="Tất cả"
              count={products.length}
              active={category === ALL_CATEGORY_ID}
              onClick={() => setCategory(ALL_CATEGORY_ID)}
            />
            {categories.map((c) => (
              <TabButton
                key={c.id}
                label={c.name}
                count={categoryCounts.get(c.id) ?? 0}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
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
                  <th className="px-3 py-2 text-right font-medium">Giá bán lẻ</th>
                  <th className="w-24 px-3 py-2 text-center font-medium">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {dialogProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                      Không tìm thấy sản phẩm phù hợp.
                    </td>
                  </tr>
                ) : (
                  dialogProducts.map((product) => (
                    <AddProductRow
                      key={product.id}
                      product={product}
                      checked={cart[product.id] !== undefined}
                      quantity={cart[product.id] ?? 1}
                      pricingSettings={pricingSettings}
                      onToggle={toggleSelected}
                      onQuantityChange={updateQuantity}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button onClick={() => setAddDialogOpen(false)}>Xong ({totalItems} sản phẩm đã chọn)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const AddProductRow = memo(function AddProductRow({
  product,
  checked,
  quantity,
  pricingSettings,
  onToggle,
  onQuantityChange,
}: {
  product: Product;
  checked: boolean;
  quantity: number;
  pricingSettings: PricingSettings;
  onToggle: (productId: string, checked: boolean) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
}) {
  const retailUsd = computePricesUsd(product.priceUsd, pricingSettings).retailUsd;
  const retailVnd = usdToVnd(retailUsd, pricingSettings.usdToVndRate);

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
      <td className="max-w-[240px] px-3 py-2 font-medium">
        <span className="line-clamp-2">{product.name}</span>
        <p className="text-xs font-normal text-muted-foreground">{product.model}</p>
      </td>
      <td className="px-3 py-2 text-right font-semibold text-primary">{formatVND(retailVnd)}</td>
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
