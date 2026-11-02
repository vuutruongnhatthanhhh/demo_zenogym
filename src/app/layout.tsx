import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "ZenoGym - Báo giá thiết bị tập gym",
  description: "Catalog thiết bị tập gym và hệ thống báo giá ZenoGym",
};

const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isMaintenanceMode) {
    return (
      <html lang="vi">
        <body className="flex min-h-screen items-center justify-center bg-background p-4 font-sans antialiased">
          <p className="text-center text-lg font-medium text-slate-700">
            Website đang gặp vấn đề, vui lòng liên hệ nhà cung cấp
          </p>
        </body>
      </html>
    );
  }

  return (
    <html lang="vi">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
        <SiteFooter />
      </body>
    </html>
  );
}
