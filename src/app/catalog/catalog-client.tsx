"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  LogOut,
  LayoutDashboard,
  Search,
  Info,
  UserCircle,
  LogIn,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn, formatVND } from "@/lib/utils";
import {
  computePricesUsd,
  usdToVnd,
  type PricingSettings,
} from "@/lib/pricing";
import type { Category, Product } from "@/lib/types";
import { QuoteCartDialog } from "./quote-cart-dialog";

export interface CartLine {
  product: Product;
  quantity: number;
}

// Used to carry the selected items across the redirect to /login and back,
// since navigating away resets this component's in-memory state. This must
// be localStorage, not sessionStorage: registering a new account requires
// leaving to check email and clicking a confirmation link, which commonly
// opens a new tab — sessionStorage wouldn't be visible there, but
// localStorage is (same browser, same origin). The timestamp guards against
// resurrecting a cart from a long-abandoned attempt.
const PENDING_CART_KEY = "zenogym_pending_cart";
const PENDING_CART_TTL_MS = 60 * 60 * 1000;

// Sentinel tab id for "show every category at once" — distinct from any real
// category UUID so it can't collide with actual data.
const ALL_CATEGORY_ID = "all";
const ALL_SERIES_ID = "all";

export function CatalogClient({
  products,
  categories,
  pricingSettings,
  customerName,
  customerEmail,
  customerPhone,
  customerCompany,
  customerAddress,
  isAdmin,
  isLoggedIn,
  linkCode,
}: {
  products: Product[];
  categories: Category[];
  pricingSettings: PricingSettings;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  customerAddress: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
  linkCode?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [category, setCategory] = useState<string>(() => ALL_CATEGORY_ID);
  const [series, setSeries] = useState<string>(ALL_SERIES_ID);
  const [search, setSearch] = useState("");
  // Nothing is pre-selected — the customer picks what they actually want.
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  // Nudges an anonymous visitor to log in as soon as they land on the page
  // (separate from authPromptOpen, which only appears when they try to
  // submit) — dismissible so they can still just browse without an account.
  const [browseGateOpen, setBrowseGateOpen] = useState(!isLoggedIn);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  // If we just came back from a login redirect, restore the cart selection
  // that was saved before leaving and reopen the dialog so the customer can
  // simply pick up where they left off.
  useEffect(() => {
    // Admins land here from time to time (browsing, testing) — never pop
    // the customer quote form open on them, even if a stray pending cart
    // happens to be sitting in localStorage from an earlier session.
    if (!isLoggedIn || isAdmin) return;
    try {
      const raw = localStorage.getItem(PENDING_CART_KEY);
      if (!raw) return;
      localStorage.removeItem(PENDING_CART_KEY);
      const saved = JSON.parse(raw) as {
        cart: Record<string, number>;
        path: string;
        savedAt: number;
      };
      const isFresh = Date.now() - saved.savedAt < PENDING_CART_TTL_MS;
      if (isFresh && saved.path === pathname) {
        setCart(saved.cart);
        setCartOpen(true);
      }
    } catch {
      // Ignore malformed/unavailable storage.
    }
    // Only relevant right after mount, once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All products are already on the client (see getAvailableProducts), so
  // tab/search filtering is just an in-memory filter — no network round
  // trip, no debounce needed, and it stays instant even for a large catalog.
  //
  // Scoped to the active category tab first — series options and the
  // "series" filter itself only ever apply within whichever tab is open, so
  // a series chosen under one category can't silently hide everything after
  // switching tabs (it gets reset instead, see handleCategoryChange).
  const productsInCategory = useMemo(
    () =>
      category === ALL_CATEGORY_ID
        ? products
        : products.filter((p) => p.categoryId === category),
    [products, category],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const displayedProducts = useMemo(() => {
    let list = productsInCategory;
    if (series !== ALL_SERIES_ID) list = list.filter((p) => p.series === series);
    if (!normalizedSearch) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedSearch) ||
        p.model.toLowerCase().includes(normalizedSearch),
    );
  }, [productsInCategory, series, normalizedSearch]);

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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products)
      counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return counts;
  }, [products]);

  const cartLines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        return product ? { product, quantity } : null;
      })
      .filter((line): line is CartLine => line !== null);
  }, [cart, products]);

  const totalItems = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  // Stable identities (empty deps — both only use the functional setCart
  // form) so memoized ProductRows below can skip re-rendering when some
  // other row's checkbox/quantity changes.
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
    (productId: string, checked: boolean) => {
      updateQuantity(productId, checked ? 1 : 0);
    },
    [updateQuantity],
  );

  const handlePreview = useCallback((src: string, alt: string) => {
    setPreviewImage({ src, alt });
  }, []);

  const selectedInViewCount = displayedProducts.filter(
    (p) => cart[p.id] !== undefined,
  ).length;
  const allVisibleSelected =
    displayedProducts.length > 0 &&
    selectedInViewCount === displayedProducts.length;

  function toggleSelectAllVisible() {
    setCart((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        displayedProducts.forEach((p) => delete next[p.id]);
      } else {
        displayedProducts.forEach((p) => {
          if (next[p.id] === undefined) next[p.id] = 1;
        });
      }
      return next;
    });
  }

  // Submitting a quote request requires an account — browsing doesn't. Show
  // a prompt first instead of redirecting straight away, so the customer
  // picks login vs. register themselves.
  function openCart() {
    if (!isLoggedIn) {
      setAuthPromptOpen(true);
      return;
    }
    setCartOpen(true);
  }

  // Save the current selection so it survives the round trip to /login (or
  // /register, which needs an extra hop to confirm by email) — only once
  // the customer actually picks one of the two options.
  function goToAuth(path: "/login" | "/register") {
    try {
      localStorage.setItem(
        PENDING_CART_KEY,
        JSON.stringify({ cart, path: pathname, savedAt: Date.now() }),
      );
    } catch {
      // Ignore unavailable storage (e.g. private browsing edge cases).
    }
    router.push(`${path}?redirect=${encodeURIComponent(pathname)}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <a href="/catalog" className="block">
            <h1 className="text-lg font-bold text-primary sm:text-xl">
              ZenoGym
            </h1>
            <p className="text-xs text-muted-foreground">
              Catalog thiết bị tập gym
            </p>
          </a>
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
              onClick={openCart}
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
            {isLoggedIn ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Tài khoản">
                      <UserCircle className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href="/account">
                        <UserCircle className="h-4 w-4" /> Thông tin tài khoản
                      </a>
                    </DropdownMenuItem>
                    {!isAdmin ? (
                      <DropdownMenuItem asChild>
                        <a href="/account/quotes">
                          <FileText className="h-4 w-4" /> Yêu cầu báo giá của
                          tôi
                        </a>
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Đăng xuất"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToAuth("/login")}
              >
                <LogIn className="mr-1 h-4 w-4" /> Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
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

        <div className="mb-2 flex flex-wrap gap-1 border-b">
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

        <div className="mb-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Tick chọn những sản phẩm bạn muốn nhận báo giá, sau đó nhấn &quot;Gửi yêu cầu báo giá&quot;.
          </p>
        </div>

        <Card
          className={cn(
            browseGateOpen && "pointer-events-none select-none blur-sm",
          )}
        >
          <CardContent className="p-0">
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b bg-slate-50 text-left text-xs text-muted-foreground">
                    <th className="w-10 px-3 py-2 font-medium">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        disabled={displayedProducts.length === 0}
                        onChange={toggleSelectAllVisible}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                    </th>
                    <th className="w-16 px-3 py-2 font-medium"></th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="px-3 py-2 font-medium">Series</th>
                    <th className="px-3 py-2 font-medium">Tên sản phẩm</th>
                    <th className="px-3 py-2 font-medium">Loại</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Giá bán lẻ
                    </th>
                    <th className="w-24 px-3 py-2 text-center font-medium">
                      Số lượng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-10 text-center text-muted-foreground"
                      >
                        Không tìm thấy thiết bị phù hợp.
                      </td>
                    </tr>
                  ) : (
                    displayedProducts.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        checked={cart[product.id] !== undefined}
                        quantity={cart[product.id] ?? 1}
                        pricingSettings={pricingSettings}
                        onToggle={toggleSelected}
                        onQuantityChange={updateQuantity}
                        onPreview={handlePreview}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex flex-col items-center gap-1.5 sm:items-end">
          <Button size="lg" onClick={openCart} disabled={totalItems === 0}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Gửi yêu cầu báo giá
            {totalItems > 0 ? (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
                {totalItems}
              </span>
            ) : null}
          </Button>
          {totalItems === 0 ? (
            <p className="text-xs text-muted-foreground">Vui lòng chọn ít nhất một sản phẩm để gửi yêu cầu báo giá.</p>
          ) : null}
        </div>
      </main>

      <QuoteCartDialog
        open={cartOpen}
        onOpenChange={setCartOpen}
        cartLines={cartLines}
        defaultName={customerName}
        defaultEmail={customerEmail}
        defaultPhone={customerPhone}
        defaultCompany={customerCompany}
        defaultAddress={customerAddress}
        linkCode={linkCode}
        isLoggedIn={isLoggedIn}
        onUpdateQuantity={updateQuantity}
      />

      {totalItems > 0 && !cartOpen ? (
        <button
          onClick={openCart}
          className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg sm:hidden"
        >
          <ShoppingCart className="h-4 w-4" /> {totalItems} thiết bị
        </button>
      ) : null}

      <Dialog open={browseGateOpen} onOpenChange={setBrowseGateOpen}>
        <DialogContent
          className="max-w-sm"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Đăng nhập để lưu lịch sử chọn thiết bị</DialogTitle>
            <DialogDescription className="text-black mt-2">
              Bạn cần đăng nhập để lưu lại lịch sử chọn thiết bị và gửi yêu cầu
              báo giá. Bạn cũng có thể chỉ xem catalog mà không cần đăng nhập.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setBrowseGateOpen(false)}
            >
              Chỉ xem, không lưu lịch sử
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => goToAuth("/login")}
            >
              Đăng nhập
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cần đăng nhập để gửi yêu cầu báo giá</DialogTitle>
            <DialogDescription>
              Vui lòng đăng nhập hoặc đăng ký tài khoản để gửi yêu cầu báo giá.
              Sản phẩm bạn đã chọn sẽ được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => goToAuth("/login")}
            >
              Đăng nhập
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => goToAuth("/register")}
            >
              Đăng ký
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogTitle className="sr-only">
            {previewImage?.alt ?? "Ảnh sản phẩm"}
          </DialogTitle>
          {previewImage ? (
            <div className="relative h-[70vh] w-full">
              <Image
                src={previewImage.src}
                alt={previewImage.alt}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Memoized so ticking one row's checkbox/quantity doesn't force React to
// re-render every other row in a catalog that can have 1000+ products —
// checked/quantity are passed as plain primitives, so React.memo's default
// shallow comparison correctly bails out for every row except the one that
// actually changed.
const ProductRow = memo(function ProductRow({
  product,
  checked,
  quantity,
  pricingSettings,
  onToggle,
  onQuantityChange,
  onPreview,
}: {
  product: Product;
  checked: boolean;
  quantity: number;
  pricingSettings: PricingSettings;
  onToggle: (productId: string, checked: boolean) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onPreview: (src: string, alt: string) => void;
}) {
  const retailUsd = computePricesUsd(product.priceUsd, pricingSettings).retailUsd;
  const retailVnd = usdToVnd(retailUsd, pricingSettings.usdToVndRate);

  return (
    <tr
      className={cn(
        "border-b last:border-0 hover:bg-accent/30",
        checked && "bg-primary/10 font-bold text-foreground",
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
        <button
          type="button"
          onClick={() => onPreview(product.image, product.name)}
          className="relative block h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100 transition-opacity hover:opacity-80"
        >
          <Image src={product.image} alt={product.name} fill className="object-cover" />
        </button>
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
      onClick={onClick}
      className={cn(
        "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}{" "}
      <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
        {count}
      </span>
    </button>
  );
}
