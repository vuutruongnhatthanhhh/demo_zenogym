"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  FileText,
  KeyRound,
  LogOut,
  Menu,
  Store,
  Tags,
  Factory,
  Percent,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/quotes", label: "Yêu cầu báo giá", icon: FileText },
  { href: "/admin/products", label: "Sản phẩm", icon: Dumbbell },
  { href: "/admin/categories", label: "Loại sản phẩm", icon: Tags },
  { href: "/admin/factories", label: "Nhà máy", icon: Factory },
  { href: "/admin/pricing-settings", label: "Cấu hình giá", icon: Percent },
];

export function AdminSidebar({
  name,
  email,
  isSuperAdmin,
}: {
  name: string;
  email: string;
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleLinks = isSuperAdmin
    ? [...links, { href: "/admin/accounts", label: "Quản lý tài khoản", icon: Users }]
    : links;

  // Close the mobile menu automatically whenever navigation actually happens.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 z-50 shrink-0 bg-white md:flex md:h-screen md:w-60 md:flex-col md:border-r">
      <div className="flex h-12 items-center justify-between border-b px-4 md:h-auto md:border-b-0 md:py-4">
        <div>
          <p className="text-sm font-bold text-primary md:text-lg">ZenoGym</p>
          <p className="text-[11px] text-muted-foreground md:text-xs">Bảng quản trị</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/60 md:hidden"
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <button
        type="button"
        aria-label="Đóng menu"
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-72 max-w-[80vw] flex-col overflow-hidden border-l bg-white shadow-lg transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "translate-x-full",
          "md:static md:z-auto md:inset-auto md:h-auto md:w-auto md:max-w-none md:flex-1 md:translate-x-0 md:border-l-0 md:shadow-none md:transition-none"
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b px-4 md:hidden">
          <div>
            <p className="text-sm font-bold text-primary">ZenoGym</p>
            <p className="text-[11px] text-muted-foreground">Bảng quản trị</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/60"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
          {visibleLinks.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60"
                )}
              >
                <Icon className="h-4 w-4" /> {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t p-3 md:mt-auto">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          {isSuperAdmin ? (
            <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              Super admin
            </span>
          ) : null}
          <Link
            href="/account"
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <KeyRound className="h-3.5 w-3.5" /> Đổi mật khẩu
          </Link>
        </div>
        <div className="flex shrink-0 flex-col gap-1 border-t p-2">
          <Link
            href="/catalog"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60"
          >
            <Store className="h-4 w-4" /> Xem trang khách hàng
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/60"
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}
