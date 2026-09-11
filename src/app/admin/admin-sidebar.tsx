"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Dumbbell, FileText, LogOut, Store, Tags, Factory, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Sản phẩm", icon: Dumbbell },
  { href: "/admin/categories", label: "Loại sản phẩm", icon: Tags },
  { href: "/admin/factories", label: "Nhà máy", icon: Factory },
  { href: "/admin/pricing-settings", label: "Cấu hình giá", icon: Percent },
  { href: "/admin/quotes", label: "Yêu cầu báo giá", icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex shrink-0 flex-col border-b bg-white md:w-60 md:border-b-0 md:border-r">
      <div className="p-4">
        <p className="text-lg font-bold text-primary">ZenoGym</p>
        <p className="text-xs text-muted-foreground">Bảng quản trị</p>
      </div>
      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
        {links.map((link) => {
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
      <div className="flex flex-col gap-1 border-t p-2">
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
    </aside>
  );
}
