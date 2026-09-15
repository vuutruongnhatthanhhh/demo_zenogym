import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "ZenoGym - Báo giá thiết bị tập gym",
  description: "Catalog thiết bị tập gym và hệ thống báo giá ZenoGym",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
        <SiteFooter />
      </body>
    </html>
  );
}
