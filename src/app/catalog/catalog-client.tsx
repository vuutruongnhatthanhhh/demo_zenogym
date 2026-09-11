"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { ShoppingCart, LogOut, LayoutDashboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PRODUCT_CATEGORIES, type Product } from "@/lib/types";
import { QuoteCartDialog } from "./quote-cart-dialog";

export interface CartLine {
  product: Product;
  quantity: number;
}

export function CatalogClient({
  products,
  customerName,
  customerEmail,
  isAdmin,
}: {
  products: Product[];
  customerName: string;
  customerEmail: string;
  isAdmin: boolean;
}) {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = category === "all" || p.category === category;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [products, category, search]);

  const cartLines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        return product ? { product, quantity } : null;
      })
      .filter((line): line is CartLine => line !== null);
  }, [cart, products]);

  const totalItems = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  function addToCart(productId: string) {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: quantity };
    });
  }

  function clearCart() {
    setCart({});
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-primary sm:text-xl">ZenoGym</h1>
            <p className="text-xs text-muted-foreground">Catalog thiết bị tập gym</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button variant="outline" size="sm" asChild>
                <a href="/admin">
                  <LayoutDashboard className="mr-1 h-4 w-4" /> Trang quản trị
                </a>
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCartOpen(true)}
              className="relative"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Yêu cầu báo giá</span>
              {totalItems > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                  {totalItems}
                </span>
              ) : null}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Đăng xuất"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm thiết bị..."
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <CategoryChip label="Tất cả" active={category === "all"} onClick={() => setCategory("all")} />
            {PRODUCT_CATEGORIES.map((c) => (
              <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Không tìm thấy thiết bị phù hợp.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filtered.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden">
                <div className="relative aspect-square w-full bg-slate-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <CardContent className="flex flex-1 flex-col gap-2 p-3">
                  <Badge variant="outline" className="w-fit text-[10px]">
                    {product.category}
                  </Badge>
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">
                    {product.name}
                  </p>
                  <Button
                    size="sm"
                    className="mt-auto"
                    onClick={() => addToCart(product.id)}
                  >
                    Thêm vào yêu cầu
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <QuoteCartDialog
        open={cartOpen}
        onOpenChange={setCartOpen}
        cartLines={cartLines}
        onUpdateQuantity={updateQuantity}
        onClearCart={clearCart}
        defaultName={customerName}
        defaultEmail={customerEmail}
      />

      {totalItems > 0 && !cartOpen ? (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg sm:hidden"
        >
          <ShoppingCart className="h-4 w-4" /> {totalItems} thiết bị
        </button>
      ) : null}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white text-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}
